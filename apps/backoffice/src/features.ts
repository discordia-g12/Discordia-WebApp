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
  'users.list': 'soon', // Ver listado de usuarios con filtros (Auth-User)
  'users.suspend': 'ready', // Suspender usuario a nivel plataforma (Auth-User, ADR-002 de Auth-User)
  'users.reactivate': 'ready', // Reactivar usuario suspendido
  'servers.list': 'soon', // Ver listado de servidores de la plataforma (Server-Roles)
  'servers.suspend': 'soon', // Suspender servidor completo
  'servers.delete': 'soon', // Eliminar servidor desde el backoffice
  'cases.user': 'soon', // Ver expediente de investigación de un usuario
  'cases.server': 'soon', // Ver expediente de investigación de un servidor
  'metrics.global': 'soon', // Ver métricas globales de la plataforma (Notification-Audit-Metrics)
  'status.services': 'ready', // Estado de cada servicio (GET /api/v1/admin/status, Notification)
  'status.incidents': 'soon', // Publicar y resolver incidentes
  'observability.grafana': 'ready', // Links a Grafana: no dependen de ningún endpoint
} satisfies Record<string, FeatureStatus>;

export type BackofficeFeature = keyof typeof FEATURES;

export const BACKOFFICE_FEATURES: Record<BackofficeFeature, FeatureStatus> = FEATURES;

export function isFeatureReady(feature: BackofficeFeature): boolean {
  return BACKOFFICE_FEATURES[feature] === 'ready';
}
