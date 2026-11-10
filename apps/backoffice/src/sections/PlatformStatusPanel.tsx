import { useEffect, useState } from 'react';
import { ActionLink, BlockButton, Skeleton } from '@web/ui';
import {
  formatLatency,
  formatTimeAgo,
  isForbidden,
  isUnauthorized,
  platformHealthLabel,
  platformStatusErrorMessage,
  serviceErrorText,
  usePlatformStatus,
  type PlatformHealth,
  type PlatformServiceStatus,
} from '@discordia/core';
import { Cell, Note } from '../layout/Cell';
import { DataTable, ExternalLink, type Column } from '../layout/blocks';
import styles from './sections.module.css';

const HEALTH_CLASS: Record<PlatformHealth, string> = {
  operational: styles.healthOperational,
  degraded: styles.healthDegraded,
  maintenance: styles.healthMaintenance,
  unknown: styles.healthUnknown,
};

/** Estado con color y texto (el color solo no alcanza para leerlo). */
export function HealthTag({ status }: { status: PlatformHealth }) {
  return (
    <span className={`${styles.health} ${HEALTH_CLASS[status] ?? styles.healthUnknown}`}>
      <span className={styles.healthDot} aria-hidden="true" />
      {platformHealthLabel(status)}
    </span>
  );
}

/** Re-render cada 15 s para que "hace X" avance entre refrescos. */
function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Estado de los servicios: el health check de cada uno, agregado por el backend en
 * GET /api/v1/admin/status y refrescado cada 30 s. La autorización la hacen Kong y el servicio: acá solo se
 * muestra el 401 o el 403 que devuelvan.
 */
export function PlatformStatusPanel({ grafanaUrl }: { grafanaUrl?: string }) {
  const query = usePlatformStatus();
  const now = useNow();
  const { data, error, isPending, isError, isFetching, refetch } = query;

  const columns: Column<PlatformServiceStatus>[] = [
    { key: 'name', label: 'servicio', render: (s) => <span className={styles.serviceName}>{s.name}</span> },
    { key: 'status', label: 'estado', render: (s) => <HealthTag status={s.status} /> },
    { key: 'latency', label: 'latencia', render: (s) => formatLatency(s.latencyMs) },
    { key: 'since', label: 'desde', render: (s) => formatTimeAgo(s.since, now) },
    { key: 'error', label: 'motivo', render: (s) => serviceErrorText(s.error) ?? <span className={styles.muted}>—</span> },
  ];

  // Sin permiso o sin sesión, reintentar no cambia nada
  const authError = isError && (isForbidden(error) || isUnauthorized(error));

  return (
    <Cell title="Estado de los servicios" feature="status.services" wide>
      <div className={styles.statusHeader}>
        <div className={styles.statusSummary}>
          {/* Solo el estado global en la región viva: "hace X" cambia solo y no hace falta anunciarlo */}
          <span role="status" aria-live="polite" className={styles.statusSummary}>
            {data && (
              <>
                <span>Plataforma:</span> <HealthTag status={data.status} />
              </>
            )}
          </span>
          {data && <span className={styles.muted}>actualizado {formatTimeAgo(data.checkedAt, now)}</span>}
        </div>
        {!authError && (
          <BlockButton loading={isFetching} onPress={() => void refetch()}>
            Actualizar
          </BlockButton>
        )}
      </div>

      {isError && (
        <p role="alert" className={styles.statusError}>
          {platformStatusErrorMessage(error)}
          {!authError && (
            <>
              {data && ' Se muestran los últimos datos.'} <ActionLink onPress={() => void refetch()}>reintentar</ActionLink>
            </>
          )}
        </p>
      )}

      {isPending ? (
        <Skeleton lines={4} label="Consultando el estado de la plataforma" />
      ) : data ? (
        <DataTable
          caption="Estado de cada servicio"
          columns={columns}
          rows={data.services}
          rowKey={(s) => s.id}
          empty={{ title: 'sin servicios', hint: 'el backend no informó ningún servicio' }}
        />
      ) : null}

      {grafanaUrl && (
        <>
          <div className={styles.links}>
            <ExternalLink href={grafanaUrl}>Abrir Grafana</ExternalLink>
          </div>
          <Note>Requiere el túnel SSM al nodo infra (ver Observabilidad).</Note>
        </>
      )}
    </Cell>
  );
}
