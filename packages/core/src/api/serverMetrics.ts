import { useQuery } from '@tanstack/react-query';
import { useSession } from '../auth/session';
import { api } from './client';
import { ApiError, NetworkError, TimeoutError } from './errors';

export interface ServerActivityPoint {
  date: string;
  activeMembers: number | null;
  messagesSent: number | null;
  newMembers: number | null;
}

export interface ServerActivityMetrics {
  serverId: string;
  from: string;
  to: string;
  activeMembers: number | null;
  messagesSent: number | null;
  newMembers: number | null;
  hasActivity: boolean;
  partial: boolean;
  series: ServerActivityPoint[];
}

export interface ServerActivityRange {
  days?: number;
  from?: string;
  to?: string;
}

const toCountOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

export function normalizeServerActivityMetrics(raw: unknown): ServerActivityMetrics {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      serverId: '',
      from: '',
      to: '',
      activeMembers: 0,
      messagesSent: 0,
      newMembers: 0,
      hasActivity: false,
      partial: false,
      series: [],
    };
  }
  const obj = raw as Record<string, unknown>;
  const series = Array.isArray(obj.series)
    ? obj.series
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map((item) => ({
          date: typeof item.date === 'string' ? item.date : '',
          activeMembers: toCountOrNull(item.activeMembers),
          messagesSent: toCountOrNull(item.messagesSent),
          newMembers: toCountOrNull(item.newMembers),
        }))
    : [];

  const activeMembers = toCountOrNull(obj.activeMembers);
  const messagesSent = toCountOrNull(obj.messagesSent);
  const newMembers = toCountOrNull(obj.newMembers);
  const partial = obj.partial === true;
  const hasActivity =
    typeof obj.hasActivity === 'boolean'
      ? obj.hasActivity
      : (activeMembers ?? 0) > 0 || (messagesSent ?? 0) > 0 || (newMembers ?? 0) > 0;

  return {
    serverId: typeof obj.serverId === 'string' ? obj.serverId : '',
    from: typeof obj.from === 'string' ? obj.from : '',
    to: typeof obj.to === 'string' ? obj.to : '',
    activeMembers,
    messagesSent,
    newMembers,
    hasActivity,
    partial,
    series,
  };
}

export async function getServerActivityMetrics(
  serverId: string,
  range: ServerActivityRange = { days: 30 },
): Promise<ServerActivityMetrics> {
  const params = new URLSearchParams();
  if (range.from && range.to) {
    params.set('from', range.from);
    params.set('to', range.to);
  } else if (typeof range.days === 'number') {
    params.set('days', String(range.days));
  }
  const qs = params.toString();
  const path = `/api/v1/servers/${encodeURIComponent(serverId)}/metrics${qs ? `?${qs}` : ''}`;
  const raw = await api.get<unknown>(path);
  return normalizeServerActivityMetrics(raw);
}

export function isServerMetricsForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

export function serverMetricsErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'No tenés permisos de administración para ver las métricas de este servidor.';
    }
    if (error.status === 401) {
      return 'Tu sesión expiró. Volvé a iniciar sesión para ver las métricas.';
    }
    if (error.status === 404) {
      return 'El servidor no existe o fue eliminado.';
    }
    return error.detail || error.message;
  }
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return error.message;
  }
  return 'No pudimos cargar las métricas del servidor.';
}

export function useServerActivityMetricsQuery(
  serverId: string | undefined,
  range: ServerActivityRange = { days: 30 },
  enabled = true,
) {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: ['serverActivityMetrics', serverId, range.days ?? null, range.from ?? null, range.to ?? null],
    queryFn: () => {
      if (!serverId) throw new Error('serverId is required');
      return getServerActivityMetrics(serverId, range);
    },
    enabled: status === 'authenticated' && !!serverId && enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: (failureCount, err) => {
      if (err instanceof ApiError && [400, 401, 403, 404].includes(err.status)) return false;
      return failureCount < 1;
    },
  });
}
