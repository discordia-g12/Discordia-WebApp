import {
  formatTimeAgo,
  INCIDENT_KIND_LABEL,
  platformHealthLabel,
  platformServiceName,
  usePublicPlatformStatus,
  type PlatformHealth,
} from '@discordia/core';
import { ActionLink, EmptyState, Modal, Skeleton } from '../../ui';
import styles from './PlatformStatusModal.module.css';

const HEALTH_CLASS: Record<PlatformHealth, string> = {
  operational: styles.operational,
  degraded: styles.degraded,
  maintenance: styles.maintenance,
  unknown: styles.unknown,
};

function HealthTag({ status }: { status: string }) {
  return (
    <span className={`${styles.health} ${HEALTH_CLASS[status as PlatformHealth] ?? styles.unknown}`}>
      {platformHealthLabel(status)}
    </span>
  );
}

/**
 * Estado de la plataforma (historia 74, CA 3): el estado actual (operativo, degradado o en mantenimiento), los
 * incidentes activos y cada servicio. Usa la misma consulta que el aviso, así abrirlo no espera a la red.
 */
export function PlatformStatusModal({ onClose }: { onClose: () => void }) {
  const { data, isPending, isError, refetch } = usePublicPlatformStatus();

  return (
    <Modal
      title="Estado"
      description={data ? `actualizado ${formatTimeAgo(data.checkedAt)}` : 'de la plataforma'}
      onClose={onClose}
    >
      {isError && !data && (
        <p role="alert" className={styles.error}>
          No pudimos consultar el estado de la plataforma.{' '}
          <ActionLink onPress={() => void refetch()}>reintentar</ActionLink>
        </p>
      )}

      {isPending ? (
        <Skeleton lines={4} label="Consultando el estado de la plataforma" />
      ) : data ? (
        <>
          <p className={styles.global}>
            Plataforma / <HealthTag status={data.status} />
          </p>

          <section aria-label="Incidentes activos" className={styles.section}>
            <h3 className={styles.heading}>Incidentes activos /</h3>
            {data.incidents.length === 0 ? (
              <EmptyState title="no hay incidentes activos" hint="si algo no funciona bien, lo vas a ver acá" />
            ) : (
              <ul className={styles.list}>
                {data.incidents.map((incident) => (
                  <li key={incident.id} className={styles.incident}>
                    <p className={styles.incidentTitle}>
                      <span className={styles.kind}>{INCIDENT_KIND_LABEL[incident.kind] ?? 'Aviso'} /</span> {incident.title}
                    </p>
                    <p className={styles.description}>{incident.description}</p>
                    <p className={styles.meta}>
                      {incident.affectedServices.map(platformServiceName).join(', ')} · desde{' '}
                      {formatTimeAgo(incident.startedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Servicios" className={styles.section}>
            <h3 className={styles.heading}>Servicios /</h3>
            <ul className={styles.list}>
              {data.services.map((service) => (
                <li key={service.id} className={styles.service}>
                  <span>{service.name}</span>
                  <HealthTag status={service.status} />
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </Modal>
  );
}
