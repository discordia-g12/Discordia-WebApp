import { config } from '../config';

/** Dashboard provisionado desde el repo observability (grafana/dashboards/resources-per-service.json). */
export const GRAFANA_DASHBOARD_UID = 'discordia-recursos';

export function grafanaLinks(baseUrl: string = config.grafanaUrl) {
  return {
    home: baseUrl,
    resources: `${baseUrl}/d/${GRAFANA_DASHBOARD_UID}`,
  };
}
