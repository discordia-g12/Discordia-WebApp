/**
 * Estado de cada función del backoffice. Se implementan por etapas: mientras su endpoint de staff no
 * exista, la función se ve con su forma final pero deshabilitada y con "próximamente". Al terminar una
 * etapa, se pasa a 'ready' acá y se conecta su hook de React Query.
 *
 * Cada endpoint nuevo sigue el checklist de Gateway/docs/ADR-002-Rol-Staff-Backoffice.md §4 (ruta de Kong
 * con validate("staff"), chequeo de rol en el servicio, auditoría y tests 401/403/200).
 */
export type FeatureStatus = 'soon' | 'ready';

const FEATURES = {
  'users.list': 'ready', // Ver listado de usuarios con filtros (Auth-User)
  'users.suspend': 'ready', // Suspender usuario a nivel plataforma (Auth-User, ADR-002 de Auth-User)
  'users.reactivate': 'ready', // Reactivar usuario suspendido
  'servers.list': 'ready', // Ver listado de servidores de la plataforma (GET /api/v1/admin/servers, Server-Roles)
  'servers.suspend': 'ready', // Suspender servidor completo y levantar la suspensión (Server-Roles, ADR-002)
  'servers.delete': 'ready', // Eliminar servidor desde el backoffice (DELETE /api/v1/admin/servers/{id}, Server-Roles)
  'cases.user': 'soon', // Ver expediente de investigación de un usuario
  'cases.server': 'soon', // Ver expediente de investigación de un servidor
  'metrics.global': 'ready', // Ver métricas globales de la plataforma (GET /api/v1/admin/metrics, Notification-Audit-Metrics)
  'status.services': 'ready', // Estado de cada servicio (GET /api/v1/admin/status, Notification)
  'status.incidents': 'ready', // Publicar, resolver y sugerir incidentes (/api/v1/admin/incidents, Notification)
  'observability.grafana': 'ready', // Links a Grafana: no dependen de ningún endpoint
} satisfies Record<string, FeatureStatus>;

export type BackofficeFeature = keyof typeof FEATURES;

export const BACKOFFICE_FEATURES: Record<BackofficeFeature, FeatureStatus> = FEATURES;

export function isFeatureReady(feature: BackofficeFeature): boolean {
  return BACKOFFICE_FEATURES[feature] === 'ready';
}
