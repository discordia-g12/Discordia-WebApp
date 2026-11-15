import { useMemo, useState } from 'react';
import { ActionLink, BlockButton, Choice, Skeleton, UnderlineInput } from '@web/ui';
import {
  customRange,
  formatMetricValue,
  isForbidden,
  isUnauthorized,
  lastDaysRange,
  platformMetricsErrorMessage,
  usePlatformMetricsQuery,
  type PlatformMetricsRange,
} from '@discordia/core';
import { Cell, Note } from '../layout/Cell';
import { StatGrid } from '../layout/blocks';
import styles from './sections.module.css';

type Period = '7d' | '30d' | '90d' | 'custom';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
  { value: 'custom', label: 'personalizado' },
];

const PERIOD_DAYS: Record<Exclude<Period, 'custom'>, number> = { '7d': 7, '30d': 30, '90d': 90 };

/** Fecha local "AAAA-MM-DD" para el input date. */
function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "3/11/2026" (fecha local) para mostrar el período que devolvió el backend. exclusive: to no está incluido. */
function formatDay(iso: string, exclusive = false): string {
  const date = new Date(Date.parse(iso) - (exclusive ? 1 : 0));
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('es-AR');
}

/**
 * MÉTRICAS: "Ver métricas globales de la plataforma" (épica 11): usuarios activos, servidores creados y
 * mensajes enviados en un período, agregados de todos los servidores. Endpoint de Notification-Audit-Metrics
 * (GET /api/v1/admin/metrics): Kong y el servicio exigen staff. Las métricas de un servidor son de sus
 * administradores y van en los ajustes del servidor, no acá.
 */
export function MetricsSection() {
  const [period, setPeriod] = useState<Period>('30d');
  const today = toDateInput(new Date());
  const [customFrom, setCustomFrom] = useState(() => toDateInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [customTo, setCustomTo] = useState(today);
  // El rango personalizado se aplica con "Consultar", no con cada tecla
  const [applied, setApplied] = useState<PlatformMetricsRange | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

  // Los períodos fijos se calculan al elegirlos: "ahora" no cambia en cada render (ni la clave de la consulta)
  const range = useMemo(() => (period === 'custom' ? applied : lastDaysRange(PERIOD_DAYS[period])), [period, applied]);
  const { data, error, isPending, isError, isFetching, refetch } = usePlatformMetricsQuery(range);

  const applyCustom = () => {
    const result = customRange(customFrom, customTo);
    setCustomError(result.error);
    if (result.range) setApplied(result.range);
  };

  const authError = isError && (isForbidden(error) || isUnauthorized(error));
  const waitingCustom = period === 'custom' && applied === null;

  return (
    <Cell title="Métricas globales" feature="metrics.global" wide>
      <Choice label="Período" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

      {period === 'custom' && (
        <form
          className={styles.dateRange}
          aria-label="Período personalizado"
          onSubmit={(e) => {
            e.preventDefault();
            applyCustom();
          }}
        >
          <UnderlineInput label="desde" type="date" value={customFrom} max={today} onChange={(e) => setCustomFrom(e.target.value)} />
          <UnderlineInput
            label="hasta"
            type="date"
            value={customTo}
            max={today}
            onChange={(e) => setCustomTo(e.target.value)}
            error={customError ?? undefined}
          />
          <BlockButton type="submit" loading={period === 'custom' && applied !== null && isFetching}>
            Consultar
          </BlockButton>
        </form>
      )}

      {isError && (
        <p role="alert" className={styles.statusError}>
          {platformMetricsErrorMessage(error)}
          {!authError && (
            <>
              {data && ' Se muestran los últimos datos.'} <ActionLink onPress={() => void refetch()}>reintentar</ActionLink>
            </>
          )}
        </p>
      )}

      {waitingCustom ? (
        <Note>Elegí las fechas y tocá "Consultar". El período puede ser de hasta 366 días.</Note>
      ) : isPending && !isError ? (
        <Skeleton lines={2} label="Consultando las métricas de la plataforma" />
      ) : data ? (
        <>
          {data.partial && (
            <p role="status" className={styles.warning}>
              Algún servicio no respondió: las cifras que dicen "sin datos" faltan, el resto está completo.
            </p>
          )}
          <StatGrid
            stats={[
              {
                label: 'usuarios activos',
                value: formatMetricValue(data.activeUsers),
                hint: 'enviaron al menos un mensaje',
              },
              { label: 'servidores creados', value: formatMetricValue(data.serversCreated) },
              { label: 'mensajes enviados', value: formatMetricValue(data.messagesSent) },
            ]}
          />
          <Note>
            Del {formatDay(data.from)} al {formatDay(data.to, true)}, agregado de todos los servidores. Un mensaje cuenta tanto en un
            canal como por mensaje directo.
          </Note>
        </>
      ) : null}
    </Cell>
  );
}
