import { useState } from 'react';
import { Choice } from '@web/ui';
import { Cell, Note } from '../layout/Cell';
import { StatGrid } from '../layout/blocks';

type Period = '7d' | '30d' | '90d';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
];

/**
 * MÉTRICAS: "Ver métricas globales de la plataforma" (épica 11): usuarios activos, servidores creados y
 * mensajes enviados en un período, agregados de todos los servidores. Kong ya exige staff en
 * /api/v1/metrics (Notification-Audit-Metrics). Las métricas de un servidor son de sus administradores y
 * van en los ajustes del servidor, no acá.
 */
export function MetricsSection() {
  const [period, setPeriod] = useState<Period>('30d');

  return (
    <>
      <Cell title="Métricas globales" feature="metrics.global" wide>
        <Choice label="Período" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
        <StatGrid stats={[{ label: 'usuarios activos' }, { label: 'servidores creados' }, { label: 'mensajes enviados' }]} />
        <Note>Agregado de todos los servidores de la plataforma en el período elegido.</Note>
      </Cell>
    </>
  );
}
