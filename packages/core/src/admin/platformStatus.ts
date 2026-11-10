import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { ApiError } from '../api/errors';

/**
 * Estado de la plataforma para el staff: el health check de cada servicio, agregado por el backend
 * (Notification) en GET /api/v1/admin/status. Kong responde 401 sin token y 403 si la cuenta no es staff:
 * el front no decide permisos, solo muestra lo que devuelve el servidor (ADR-002 del Gateway).
 */

/** maintenance solo sale en el estado público: lo declara el staff con un incidente de mantenimiento. */
export type PlatformHealth = 'operational' | 'degraded' | 'maintenance' | 'unknown';

export type ServiceCheckError = 'timeout' | 'connection_refused' | 'http_5xx' | 'http_4xx' | 'invalid_response';

export type PlatformServiceId = 'gateway' | 'auth' | 'server-roles' | 'chat' | 'voice' | 'notification' | 'payments';

/**
 * Los servicios que exponen /livez y /readyz, con los ids, nombres y orden de SERVICE_CATALOG de
 * Notification-Audit: son los "servicios afectados" que se pueden elegir en un incidente.
 */
export const PLATFORM_SERVICES: { id: PlatformServiceId; name: string }[] = [
  { id: 'gateway', name: 'API Gateway' },
  { id: 'auth', name: 'Auth y usuarios' },
  { id: 'server-roles', name: 'Servidores y roles' },
  { id: 'chat', name: 'Chat' },
  { id: 'voice', name: 'Voz' },
  { id: 'notification', name: 'Notificaciones y auditoría' },
  { id: 'payments', name: 'Pagos' },
];

/** Nombre de un servicio por id; un id desconocido se muestra tal cual. */
export function platformServiceName(id: string): string {
  return PLATFORM_SERVICES.find((s) => s.id === id)?.name ?? id;
}

export interface PlatformServiceStatus {
  /** Uno de PlatformServiceId; string para no romper si el backend suma un servicio. */
  id: string;
  name: string;
  status: PlatformHealth;
  httpStatus: number | null;
  latencyMs: number | null;
  /** Último chequeo (ISO). */
  checkedAt: string | null;
  /** Desde cuándo está en el estado actual (ISO). */
  since: string | null;
  error: ServiceCheckError | null;
}

export interface PlatformStatus {
  status: PlatformHealth;
  checkedAt: string | null;
  services: PlatformServiceStatus[];
}

export type IncidentKind = 'degraded' | 'maintenance';

/** Un incidente activo como lo ve cualquier usuario (sin autor ni datos de cierre). */
export interface PublicIncident {
  id: string;
  kind: IncidentKind;
  title: string;
  description: string;
  /** Ids de PlatformServiceId. */
  affectedServices: string[];
  startedAt: string;
}

/**
 * La versión pública (GET /api/v1/status): sin detalle técnico de cada servicio. El estado ya combina el sondeo
 * con los incidentes activos (historia 74).
 */
export interface PublicPlatformStatus {
  status: PlatformHealth;
  checkedAt: string | null;
  services: Pick<PlatformServiceStatus, 'id' | 'name' | 'status'>[];
  incidents: PublicIncident[];
}

export const PLATFORM_STATUS_REFETCH_MS = 30_000;

export const platformStatusQueryKey = ['admin', 'platformStatus'] as const;

/** Cada cuánto la app vuelve a pedir el estado público: el aviso aparece y se va en ese plazo (CA 1 y 2). */
export const PUBLIC_STATUS_REFETCH_MS = 60_000;

export const publicPlatformStatusQueryKey = ['platformStatus', 'public'] as const;

export function getPlatformStatus(): Promise<PlatformStatus> {
  return api.get<PlatformStatus>('/api/v1/admin/status');
}

export async function getPublicPlatformStatus(): Promise<PublicPlatformStatus> {
  const raw = await api.get<Partial<PublicPlatformStatus>>('/api/v1/status', { skipAuth: true });
  // Un backend anterior a los incidentes no manda el campo: sin incidentes.
  return {
    status: raw.status ?? 'unknown',
    checkedAt: raw.checkedAt ?? null,
    services: raw.services ?? [],
    incidents: Array.isArray(raw.incidents) ? raw.incidents : [],
  };
}

/**
 * Estado público e incidentes activos para los usuarios con sesión. Se pide cada 60 s solo con la pestaña
 * visible (React Query pausa el intervalo en segundo plano) y otra vez al volver a la pestaña, así un incidente
 * nuevo o resuelto se ve en menos de un minuto sin WebSocket (ADR-03 de Notification-Audit).
 */
export function usePublicPlatformStatus({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: publicPlatformStatusQueryKey,
    queryFn: getPublicPlatformStatus,
    enabled,
    refetchInterval: PUBLIC_STATUS_REFETCH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

/**
 * Estado de la plataforma (staff), refrescado cada 30 s. Ante 401 o 403 no reintenta ni sigue refrescando: no van
 * a cambiar solos (el botón "Actualizar" vuelve a pedirlo).
 */
export function usePlatformStatus({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: platformStatusQueryKey,
    queryFn: getPlatformStatus,
    enabled,
    refetchInterval: (query) =>
      isUnauthorized(query.state.error) || isForbidden(query.state.error) ? false : PLATFORM_STATUS_REFETCH_MS,
    retry: (failureCount, error) => !isUnauthorized(error) && !isForbidden(error) && failureCount < 2,
  });
}

export const PLATFORM_HEALTH_LABEL: Record<PlatformHealth, string> = {
  operational: 'Operativo',
  degraded: 'Degradado',
  maintenance: 'En mantenimiento',
  unknown: 'Sin datos',
};

export const INCIDENT_KIND_LABEL: Record<IncidentKind, string> = {
  degraded: 'Degradación',
  maintenance: 'Mantenimiento',
};

/** Etiqueta de un estado; uno desconocido (si el backend suma otro) se muestra como "Sin datos". */
export function platformHealthLabel(status: string): string {
  return PLATFORM_HEALTH_LABEL[status as PlatformHealth] ?? PLATFORM_HEALTH_LABEL.unknown;
}

const SERVICE_ERROR_TEXT: Record<ServiceCheckError, string> = {
  timeout: 'Sin respuesta (timeout)',
  connection_refused: 'Conexión rechazada',
  http_5xx: 'Error del servidor (5xx)',
  http_4xx: 'Respuesta rechazada (4xx)',
  invalid_response: 'Respuesta inválida',
};

/** Motivo del último chequeo fallido, o null si no hubo error. */
export function serviceErrorText(error: string | null | undefined): string | null {
  if (!error) return null;
  return SERVICE_ERROR_TEXT[error as ServiceCheckError] ?? 'Error desconocido';
}

/** 85 → "85 ms"; 1234 → "1,2 s"; sin dato → "—". */
export function formatLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} s`;
}

/** "hace 5 min", "hace 2 h"... para since/checkedAt. Sin dato o fecha inválida → "—". */
export function formatTimeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—';
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '—';
  const seconds = Math.floor((now - time) / 1000);
  if (seconds < 10) return 'recién';
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

/** Mensaje para el staff cuando el pedido falla. */
export function platformStatusErrorMessage(error: unknown): string {
  if (isUnauthorized(error)) return 'Tu sesión venció, volvé a iniciar sesión.';
  if (isForbidden(error)) return 'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.';
  return 'No pudimos consultar el estado de la plataforma.';
}
