import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { ApiError, NetworkError, TimeoutError } from '../api/errors';
import {
  isForbidden,
  isUnauthorized,
  publicPlatformStatusQueryKey,
  type IncidentKind,
  type PlatformStatus,
  type PublicIncident,
} from './platformStatus';

/**
 * Incidentes de la plataforma (historia 74): el staff los publica y los resuelve desde el backoffice, y los
 * usuarios los ven en la app por GET /api/v1/status. Endpoints de Notification-Audit bajo
 * /api/v1/admin/incidents: Kong exige el rol staff y el servicio lo vuelve a chequear (ADR-002 del Gateway).
 */

/** Límites del backend (Notification-Audit, ADR-03). */
export const INCIDENT_TITLE_MIN = 3;
export const INCIDENT_TITLE_MAX = 120;
export const INCIDENT_DESCRIPTION_MAX = 1000;
export const INCIDENT_NOTE_MAX = 1000;

/** Un incidente como lo ve el staff: lo público más estado, autor y cierre. */
export interface AdminIncident extends PublicIncident {
  status: 'active' | 'resolved';
  createdBy: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface NewIncidentInput {
  title: string;
  description: string;
  kind: IncidentKind;
  affectedServices: string[];
}

export interface IncidentPage {
  items: AdminIncident[];
  nextBefore: string | null;
}

export const incidentsQueryKey = ['admin', 'incidents'] as const;
export const activeIncidentsQueryKey = [...incidentsQueryKey, 'active'] as const;
export const incidentHistoryQueryKey = [...incidentsQueryKey, 'history'] as const;

const BASE = '/api/v1/admin/incidents';

export function listIncidents(params: { status?: 'active' | 'resolved'; limit?: number; before?: string } = {}) {
  return api.get<IncidentPage>(BASE, { query: { status: params.status, limit: params.limit, before: params.before } });
}

export function createIncident(input: NewIncidentInput): Promise<AdminIncident> {
  return api.post<AdminIncident>(BASE, {
    title: input.title.trim(),
    description: input.description.trim(),
    kind: input.kind,
    affectedServices: input.affectedServices,
  });
}

export function resolveIncident({ id, note }: { id: string; note?: string }): Promise<AdminIncident> {
  const trimmed = note?.trim();
  return api.post<AdminIncident>(`${BASE}/${encodeURIComponent(id)}/resolve`, trimmed ? { note: trimmed } : {});
}

const noAuthRetry = (failureCount: number, error: unknown) =>
  !isUnauthorized(error) && !isForbidden(error) && failureCount < 2;

/** Incidentes activos (hasta 100, los más nuevos primero), refrescados como el estado de los servicios. */
export function useActiveIncidents({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: activeIncidentsQueryKey,
    queryFn: async () => (await listIncidents({ status: 'active', limit: 100 })).items,
    enabled,
    refetchInterval: (query) =>
      isUnauthorized(query.state.error) || isForbidden(query.state.error) ? false : 30_000,
    retry: noAuthRetry,
  });
}

/** Historial: los últimos incidentes resueltos. */
export function useIncidentHistory({ enabled = true, limit = 10 }: { enabled?: boolean; limit?: number } = {}) {
  return useQuery({
    queryKey: [...incidentHistoryQueryKey, limit] as const,
    queryFn: () => listIncidents({ status: 'resolved', limit }),
    enabled,
    retry: noAuthRetry,
  });
}

/** Publicar o resolver cambia los activos, el historial y el estado público: se refrescan los tres. */
function useInvalidateIncidents() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: incidentsQueryKey }),
      queryClient.invalidateQueries({ queryKey: publicPlatformStatusQueryKey }),
    ]);
}

export function useCreateIncident() {
  const invalidate = useInvalidateIncidents();
  return useMutation({ mutationFn: createIncident, onSuccess: invalidate });
}

export function useResolveIncident() {
  const invalidate = useInvalidateIncidents();
  return useMutation({ mutationFn: resolveIncident, onSuccess: invalidate });
}

export type IncidentAction = 'create' | 'resolve' | 'list';

/** Mensaje para el staff cuando falla publicar, resolver o listar. Siempre dice qué hacer. */
export function incidentErrorMessage(error: unknown, action: IncidentAction): string {
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return 'No pudimos conectar con el servidor. Revisá tu conexión y probá de nuevo.';
  }
  if (isUnauthorized(error)) return 'Tu sesión venció, volvé a iniciar sesión.';
  if (isForbidden(error)) return 'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.';
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return action === 'resolve'
        ? 'La nota de cierre no es válida (hasta 1000 caracteres).'
        : `Revisá los campos: título de ${INCIDENT_TITLE_MIN} a ${INCIDENT_TITLE_MAX} caracteres, descripción y al menos un servicio.`;
    }
    if (error.status === 404) return 'Ese incidente ya no existe.';
    if (error.status === 409) return 'Ese incidente ya estaba resuelto.';
  }
  if (action === 'list') return 'No pudimos traer los incidentes.';
  return action === 'create' ? 'No se pudo publicar el incidente.' : 'No se pudo resolver el incidente.';
}

/** Un servicio que el sondeo ve degradado y que ningún incidente activo cubre. */
export interface IncidentSuggestion {
  serviceId: string;
  serviceName: string;
  /** Desde cuándo está degradado (ISO). */
  since: string | null;
  /** Identifica esta degradación: si el servicio se recupera y vuelve a caer, es otra sugerencia. */
  key: string;
}

/**
 * Plus de la historia 74: sugerir un incidente cuando un health check informa degradación. Sale del estado
 * staff (sondeo crudo) cruzado con los activos; lo descartado (por key) no se vuelve a sugerir.
 */
export function incidentSuggestions(
  status: PlatformStatus | undefined,
  activeIncidents: readonly Pick<AdminIncident, 'affectedServices'>[] | undefined,
  dismissed: ReadonlySet<string> = new Set(),
): IncidentSuggestion[] {
  if (!status || !activeIncidents) return [];
  const covered = new Set(activeIncidents.flatMap((i) => i.affectedServices));
  return status.services
    .filter((s) => s.status === 'degraded' && !covered.has(s.id))
    .map((s) => ({ serviceId: s.id, serviceName: s.name, since: s.since, key: `${s.id}@${s.since ?? ''}` }))
    .filter((s) => !dismissed.has(s.key));
}

/** Título que se propone al crear un incidente desde una sugerencia. */
export function suggestedIncidentTitle(serviceName: string): string {
  return `Problemas en ${serviceName}`.slice(0, INCIDENT_TITLE_MAX);
}
