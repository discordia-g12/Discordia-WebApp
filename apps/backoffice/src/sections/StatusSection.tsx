import { useState } from 'react';
import { grafanaLinks } from './grafana';
import { PlatformStatusPanel } from './PlatformStatusPanel';
import {
  ActiveIncidentsCell,
  IncidentHistoryCell,
  IncidentSuggestionsCell,
  PublishIncidentCell,
  type IncidentPrefill,
} from './IncidentCells';

/**
 * ESTADO: "Estado de la plataforma e incidentes" (historia 74). El staff publica un incidente (título,
 * descripción, tipo y servicios afectados) y los usuarios ven un aviso en la app hasta que se resuelve. Cuando
 * un health check (/readyz) informa degradación y ningún incidente activo cubre ese servicio, se sugiere uno.
 */
export function StatusSection() {
  const [prefill, setPrefill] = useState<IncidentPrefill | null>(null);

  return (
    <>
      <PlatformStatusPanel grafanaUrl={grafanaLinks().home} />
      <IncidentSuggestionsCell onSuggest={(p) => setPrefill({ ...p, key: Date.now() })} />
      <PublishIncidentCell key={prefill?.key ?? 'empty'} prefill={prefill} />
      <ActiveIncidentsCell />
      <IncidentHistoryCell />
    </>
  );
}
