import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { ApiError, NetworkError, PROBLEM_TYPES, TimeoutError } from '../api/errors';
import { isForbidden, isUnauthorized } from './platformStatus';

/**
 * Suspender un servidor completo y levantar la suspensión (backoffice, solo staff). Los endpoints son de
 * Server-Roles (/api/v1/admin/servers): el servidor se identifica por id porque el nombre no es único. Mientras
 * dure, ningún miembro puede usarlo y su contenido se conserva; Chat y Voz cierran sus conexiones con el evento
 * server.suspended (ADR-002 de Server-Roles). Kong exige el rol staff y Server-Roles lo vuelve a chequear.
 */

/** Un servidor como lo ve el backoffice, con su estado de suspensión. */
export interface AdminServer {
  id: string;
  name: string;
  ownerId: string;
  iconUrl: string | null;
  memberCount: number;
  createdAt: string;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedBy: string | null;
  suspensionReason: string | null;
}

interface AdminServerResponse {
  id: string;
  name: string;
  owner_id: string;
  icon_url?: string | null;
  member_count: number;
  created_at: string;
  is_suspended: boolean;
  suspended_at?: string | null;
  suspended_by?: string | null;
  suspension_reason?: string | null;
}

export function toAdminServer(raw: AdminServerResponse): AdminServer {
  return {
    id: raw.id,
    name: raw.name,
    ownerId: raw.owner_id,
    iconUrl: raw.icon_url ?? null,
    memberCount: raw.member_count,
    createdAt: raw.created_at,
    isSuspended: raw.is_suspended === true,
    suspendedAt: raw.suspended_at ?? null,
    suspendedBy: raw.suspended_by ?? null,
    suspensionReason: raw.suspension_reason ?? null,
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** true si parece un id de servidor (UUID). Así se avisa antes de mandar algo que el backend rechazaría con 422. */
export function isServerId(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

export interface SuspendServerInput {
  serverId: string;
  /** Motivo: queda en el servidor y en el evento server.suspended (auditoría). */
  reason: string;
}

/** Todo lo de servidores del backoffice cuelga de esta clave: suspender o levantar refresca lo que se muestre. */
export const adminServersQueryKey = ['admin', 'servers'] as const;
export const suspendedServersQueryKey = [...adminServersQueryKey, 'suspended'] as const;

export type ServerStateFilter = 'all' | 'active' | 'suspended';

export interface AdminServerFilters {
  /** Nombre (parcial, sin distinguir mayúsculas) o id exacto. */
  query: string;
  state: ServerStateFilter;
  page: number;
  pageSize: number;
}

export interface AdminServerPage {
  items: AdminServer[];
  /** Servidores que coinciden con los filtros, en todas las páginas. */
  total: number;
  page: number;
  pageSize: number;
}

export const SERVER_STATE_FILTER_OPTIONS: { value: ServerStateFilter; label: string }[] = [
  { value: 'all', label: 'todos' },
  { value: 'active', label: 'activos' },
  { value: 'suspended', label: 'suspendidos' },
];

/** "Ver listado de servidores de la plataforma" (GET /api/v1/admin/servers de Server-Roles). De acá sale el id. */
export async function listAdminServers(filters: AdminServerFilters): Promise<AdminServerPage> {
  const raw = await api.get<{ items: AdminServerResponse[]; total: number; page: number; page_size: number }>(
    '/api/v1/admin/servers',
    {
      query: {
        q: filters.query.trim() || undefined,
        state: filters.state,
        page: filters.page,
        page_size: filters.pageSize,
      },
    },
  );
  return { items: raw.items.map(toAdminServer), total: raw.total, page: raw.page, pageSize: raw.page_size };
}

export async function listSuspendedServers(): Promise<AdminServer[]> {
  const raw = await api.get<AdminServerResponse[]>('/api/v1/admin/servers/suspended');
  return raw.map(toAdminServer);
}

export async function suspendServer(input: SuspendServerInput): Promise<AdminServer> {
  const raw = await api.post<AdminServerResponse>(
    `/api/v1/admin/servers/${encodeURIComponent(input.serverId.trim())}/suspension`,
    { reason: input.reason.trim() },
  );
  return toAdminServer(raw);
}

export async function liftServerSuspension(serverId: string): Promise<AdminServer> {
  const raw = await api.delete<AdminServerResponse>(`/api/v1/admin/servers/${encodeURIComponent(serverId.trim())}/suspension`);
  return toAdminServer(raw);
}

const noAuthRetry = (failureCount: number, error: unknown) =>
  !isUnauthorized(error) && !isForbidden(error) && failureCount < 2;

/**
 * Listado de servidores con búsqueda y filtro de estado. Mientras llega una página nueva se sigue mostrando la
 * anterior, así la tabla no parpadea en cada tecla.
 */
export function useAdminServers(filters: AdminServerFilters, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...adminServersQueryKey, 'list', filters] as const,
    queryFn: () => listAdminServers(filters),
    enabled,
    placeholderData: keepPreviousData,
    retry: noAuthRetry,
  });
}

/** Servidores suspendidos, el más reciente primero (para levantar la suspensión). */
export function useSuspendedServers({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: suspendedServersQueryKey,
    queryFn: listSuspendedServers,
    enabled,
    retry: noAuthRetry,
  });
}

/** Suspender un servidor. Al terminar se vuelve a pedir el listado de suspendidos. */
export function useSuspendServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: suspendServer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminServersQueryKey }),
  });
}

/** Levantar la suspensión de un servidor. */
export function useLiftServerSuspension() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: liftServerSuspension,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminServersQueryKey }),
  });
}

/** list: el listado de servidores suspendidos; list-servers: el listado de servidores con filtros. */
export type ServerSuspensionAction = 'suspend' | 'lift' | 'list' | 'list-servers';

/** Mensaje para el staff cuando falla suspender, levantar o listar. Siempre dice qué hacer. */
export function serverSuspensionErrorMessage(error: unknown, action: ServerSuspensionAction): string {
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return 'No pudimos conectar con el servidor. Revisá tu conexión y probá de nuevo.';
  }
  if (isUnauthorized(error)) return 'Tu sesión venció, volvé a iniciar sesión.';
  if (error instanceof ApiError && error.type === PROBLEM_TYPES.ACCOUNT_SUSPENDED) {
    return 'Tu propia cuenta está suspendida.';
  }
  if (isForbidden(error)) return 'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.';
  if (action === 'list-servers') {
    if (error instanceof ApiError && error.status === 422) return 'La búsqueda no es válida: probá con menos de 100 caracteres.';
    return 'No pudimos traer el listado de servidores.';
  }
  if (error instanceof ApiError) {
    switch (error.status) {
      case 404:
        return action === 'suspend' ? 'No existe un servidor con ese id.' : 'Ese servidor ya no existe.';
      case 409:
        return action === 'suspend' ? 'Ese servidor ya está suspendido.' : 'Ese servidor ya no estaba suspendido.';
      case 422:
        return 'Revisá el id del servidor (es un UUID) y completá el motivo.';
    }
  }
  if (action === 'list') return 'No pudimos traer los servidores suspendidos.';
  return action === 'suspend' ? 'No se pudo suspender el servidor.' : 'No se pudo levantar la suspensión.';
}
