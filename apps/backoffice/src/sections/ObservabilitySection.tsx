import { Cell, Note, Row } from '../layout/Cell';
import { Command, ExternalLink } from '../layout/blocks';
import { grafanaLinks } from './grafana';

const TUNNEL_COMMAND = `aws ssm start-session --target <id del nodo infra> \\
  --document-name AWS-StartPortForwardingSession \\
  --parameters portNumber=3030,localPortNumber=3030`;

/**
 * OBSERVABILIDAD: links a Grafana (Prometheus, cAdvisor y Node Exporter). Funciona desde ya: no depende
 * de ningún endpoint. Grafana no está publicado (escucha en 127.0.0.1 del nodo infra) y pide su propio
 * usuario: el link no da acceso a nada por sí solo.
 */
export function ObservabilitySection() {
  const links = grafanaLinks();

  return (
    <>
      <Cell title="Grafana" feature="observability.grafana">
        <Row title="Inicio de Grafana" description="Dashboards y datasource de Prometheus">
          <ExternalLink href={links.home}>abrir</ExternalLink>
        </Row>
        <Row title="Recursos por servicio" description="CPU, memoria y red de cada contenedor, por nodo">
          <ExternalLink href={links.resources}>abrir</ExternalLink>
        </Row>
        <Note>Grafana pide su propio usuario y contraseña (GRAFANA_ADMIN_PASSWORD).</Note>
      </Cell>

      <Cell title="Acceso" feature="observability.grafana">
        <Note>Grafana no está publicado en internet. En producción, abrí antes el túnel al nodo infra (queda en localhost:3030):</Note>
        <Command>{TUNNEL_COMMAND}</Command>
        <Note>En desarrollo: docker compose up -d en el repo observability.</Note>
      </Cell>
    </>
  );
}
