import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { isForbidden, isUnauthorized } from './platformStatus';

/**
 * Métricas globales de la plataforma (épica 11): usuarios activos, servidores creados y mensajes enviados en
 * un período, agregados de todos los servidores. Las calcula Notification-Audit-Metrics en
 * GET /api/v1/admin/metrics?from&to: Kong exige el rol staff y el servicio lo vuelve a chequear (ADR-002 del
 * Gateway). El front no decide permisos: muestra el 401 o el 403 que devuelvan.
 */

export interface PlatformMetricsRange {
  /** Inicio del período (ISO, incluido). */
  from: string;
  /** Fin del período (ISO, excluido). */
  to: string;
}

export interface PlatformMetrics extends PlatformMetricsRange {
  /** Cuentas que enviaron al menos un mensaje (canal o DM) en el período. null: Chat no respondió. */
  activeUsers: number | null;
  /** null: Server-Roles no respondió. */
  serversCreated: number | null;
  /** null: Chat no respondió. */
  messagesSent: number | null;
  /** true si algún servicio no respondió y falta al menos un dato. */
  partial: boolean;
}

/** Límites del backend: sin from/to, los últimos 30 días; más de 366 días es un 400. */
export const PLATFORM_METRICS_DEFAULT_DAYS = 30;
export const PLATFORM_METRICS_MAX_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;

export const platformMetricsQueryKey = ['admin', 'platformMetrics'] as const;

export function getPlatformMetrics(range: PlatformMetricsRange): Promise<PlatformMetrics> {
  return api.get<PlatformMetrics>('/api/v1/admin/metrics', { query: { from: range.from, to: range.to } });
}

/** Los últimos N días hasta ahora. */
export function lastDaysRange(days: number, now: number = Date.now()): PlatformMetricsRange {
  return { from: new Date(now - days * DAY_MS).toISOString(), to: new Date(now).toISOString() };
}

/** "2026-11-03" → medianoche local de ese día, o null si no es una fecha válida. */
function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
}

export type CustomRangeResult = { range: PlatformMetricsRange; error: null } | { range: null; error: string };

/**
 * Rango personalizado a partir de dos fechas de un input date ("AAAA-MM-DD", hora local). El día "hasta"
 * entra completo: to es la medianoche del día siguiente. Se valida antes de pedir, con los mismos límites
 * que el backend, para no gastar un pedido en un 400.
 */
export function customRange(fromDate: string, toDate: string): CustomRangeResult {
  const from = parseLocalDate(fromDate);
  const until = parseLocalDate(toDate);
  if (!from || !until) return { range: null, error: 'Elegí las dos fechas.' };
  if (from >= until) return { range: null, error: 'La fecha "desde" tiene que ser anterior a "hasta".' };
  const to = new Date(until.getFullYear(), until.getMonth(), until.getDate() + 1);
  // Redondeado: un cambio de horario de verano mueve la diferencia una hora
  if (Math.round((to.getTime() - from.getTime()) / DAY_MS) > PLATFORM_METRICS_MAX_DAYS) {
    return { range: null, error: `El período no puede superar los ${PLATFORM_METRICS_MAX_DAYS} días.` };
  }
  return { range: { from: from.toISOString(), to: to.toISOString() }, error: null };
}

/**
 * Métricas del período. Sin rango (p. ej. un rango personalizado inválido) no pide nada. Ante 401 o 403 no
 * reintenta: no van a cambiar solos.
 */
export function usePlatformMetricsQuery(range: PlatformMetricsRange | null, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...platformMetricsQueryKey, range?.from ?? null, range?.to ?? null],
    queryFn: () => getPlatformMetrics(range as PlatformMetricsRange),
    enabled: enabled && range !== null,
    retry: (failureCount, error) => !isUnauthorized(error) && !isForbidden(error) && failureCount < 2,
    staleTime: 60_000,
  });
}

/** 12345 → "12.345"; sin dato → "sin datos". */
export function formatMetricValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'sin datos';
  return value.toLocaleString('es-AR');
}

/** Mensaje para el staff cuando el pedido falla. */
export function platformMetricsErrorMessage(error: unknown): string {
  if (isUnauthorized(error)) return 'Tu sesión venció, volvé a iniciar sesión.';
  if (isForbidden(error)) return 'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.';
  return 'No pudimos consultar las métricas de la plataforma.';
}
