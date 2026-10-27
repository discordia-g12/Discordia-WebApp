import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Server } from '../types';
import { transitions } from './motion';
import styles from './ServerStrip.module.css';

interface ServerStripProps {
  server: Pick<Server, 'name'> & { iconUrl?: string; icon?: string; banner?: string };
  active?: boolean;
  /** Actividad nueva: "NEW ACTIVITY IN GENERAL" en la etiqueta, y una marca en la franja. */
  unread?: string | boolean;
  onPress?: () => void;
  /**
   * horizontal: tira de servidores de arriba en mobile. La activa baja en lugar de correrse, y no hay
   * etiqueta flotante (en táctil aparecería al tocar y quedaría colgada): el nombre está en el encabezado.
   */
  orientation?: 'vertical' | 'horizontal';
}

/**
 * Servidor en el rail: una franja rectangular con su imagen. Al pasar el mouse (o con foco) se despliega
 * la etiqueta negra con el nombre y la actividad.
 */
export function ServerStrip({ server, active = false, unread, onPress, orientation = 'vertical' }: ServerStripProps) {
  const horizontal = orientation === 'horizontal';
  // Posición de la etiqueta (fixed): el rail scrollea y una etiqueta absoluta quedaría recortada
  const [open, setOpen] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const show = () => {
    if (horizontal) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) setOpen({ top: rect.top, left: rect.right });
  };
  const image = server.banner || server.iconUrl || server.icon;
  const activity = typeof unread === 'string' ? unread : unread ? 'Actividad nueva' : null;

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${active ? styles.active : ''} ${horizontal ? styles.horizontal : ''}`}
      onMouseEnter={() => show()}
      onMouseLeave={() => setOpen(null)}
    >
      <button
        type="button"
        className={styles.strip}
        aria-label={activity ? `Servidor ${server.name}, ${activity.toLowerCase()}` : `Servidor ${server.name}`}
        aria-current={active ? 'true' : undefined}
        onClick={onPress}
        onFocus={() => show()}
        onBlur={() => setOpen(null)}
      >
        {image ? <img src={image} alt="" className={styles.image} /> : <span className={styles.placeholder} aria-hidden="true">{server.name.slice(0, 2)}</span>}
        {unread && <span className={styles.unread} aria-hidden="true" />}
      </button>
      <AnimatePresence>
        {open && (
          // Se despliega desde la franja: entra corriéndose hacia la derecha
          <motion.div
            className={styles.label}
            role="tooltip"
            style={{ top: open.top, left: open.left }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, transition: transitions.exit }}
            transition={reduce ? transitions.reduced : transitions.fast}
          >
            <span className={styles.name}>: {server.name}</span>
            {activity && <span className={styles.activity}>{activity}</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
