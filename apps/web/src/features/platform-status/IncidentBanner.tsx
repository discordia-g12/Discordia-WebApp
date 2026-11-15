import { AnimatePresence, motion } from 'motion/react';
import { INCIDENT_KIND_LABEL, platformServiceName, usePublicPlatformStatus, type PublicIncident } from '@discordia/core';
import { useMotionPreset } from '../../ui';
import { useUIStore } from '../../app/uiStore';
import styles from './IncidentBanner.module.css';

function summary(incidents: readonly PublicIncident[]): { kind: string; text: string } {
  if (incidents.length === 1) {
    const [incident] = incidents;
    const services = incident.affectedServices.map(platformServiceName).join(', ');
    return { kind: INCIDENT_KIND_LABEL[incident.kind] ?? 'Aviso', text: `${incident.title} · ${services}` };
  }
  const maintenance = incidents.every((i) => i.kind === 'maintenance');
  return {
    kind: maintenance ? INCIDENT_KIND_LABEL.maintenance : INCIDENT_KIND_LABEL.degraded,
    text: `${incidents.length} incidentes activos`,
  };
}

/**
 * Aviso de estado (historia 74, CA 1 y 2): una barra invertida arriba de todo mientras haya incidentes activos.
 * Los shells bajan su grilla para dejarle lugar, así que no tapa nada y no se puede cerrar: se va sola cuando el
 * staff resuelve el incidente (el estado público se vuelve a pedir cada 60 s). "_ver estado" abre el detalle.
 * Si el estado no se puede consultar no se muestra nada: la falta de datos no es un incidente.
 */
export function IncidentBanner() {
  const { data } = usePublicPlatformStatus();
  const fade = useMotionPreset('fade');
  const incidents = data?.incidents ?? [];
  const { kind, text } = incidents.length > 0 ? summary(incidents) : { kind: '', text: '' };

  return (
    <div role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {incidents.length > 0 && (
          <motion.div key="incident-banner" className={styles.bar} data-incident-banner="" {...fade}>
            <span className={styles.kind}>{kind} /</span>
            <span className={styles.text} title={text}>
              {text}
            </span>
            <button
              type="button"
              className={styles.action}
              onClick={() => useUIStore.getState().setActiveModal('platform-status')}
            >
              _ver estado
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
