import { api } from '../api/client';
import type { AuditLogPage, AuditLogQuery } from './types';

/**
 * Consulta el registro de auditoría de moderación de un servidor.
 * Requiere permisos de moderación en el servidor (Notification-Audit-Metrics-Service).
 */
export function getServerAuditLogs(serverId: string, query?: AuditLogQuery): Promise<AuditLogPage> {
  const queryParams: Record<string, string | number | undefined> = {};
  if (query?.category) queryParams.category = query.category;
  if (query?.action) queryParams.action = query.action;
  if (query?.actorId) queryParams.actor_id = query.actorId;
  if (query?.before) queryParams.before = query.before;
  if (query?.limit !== undefined) queryParams.limit = query.limit;

  return api.get<AuditLogPage>(`/api/v1/servers/${encodeURIComponent(serverId)}/audit-logs`, {
    query: queryParams,
  });
}
