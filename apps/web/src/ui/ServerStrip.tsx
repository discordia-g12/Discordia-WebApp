import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Server } from '../types';
import { transitions } from './motion';
import { ServerIcon } from './ServerIcon';
import { useContextMenuTrigger } from './useContextMenuTrigger';
import styles from './ServerStrip.module.css';

interface ServerStripProps {
  server: Pick<Server, 'name' | 'iconUrl' | 'banner'>;
  active?: boolean;
  /** Actividad nueva: "NEW ACTIVITY IN GENERAL" en la etiqueta, y una marca en la franja. */
  unread?: string | boolean;
  /** Texto del badge de no leídos ("5", "99+", "@2"). Sin él, con unread el badge va vacío. */
  badge?: string;
  onPress?: () => void;
  /** Click derecho, long-press o tecla Menú, con la posición: el menú de avisos del servidor. */
  onOpenMenu?: (x: number, y: number) => void;
  /**
   * horizontal: tira de servidores de arriba en mobile. La activa baja en lugar de correrse, y no hay
   * etiqueta flotante (en táctil aparecería al tocar y quedaría colgada): el nombre está en el encabezado.
   */
  orientation?: 'vertical' | 'horizontal';
  /** El staff suspendió el servidor: sigue en la lista, con un cartel rojo "suspended" (ADR-002 de Server-Roles). */
  suspended?: boolean;
}

/**
 * Servidor en el rail: una franja rectangular con el banner de fondo y el ícono a la izquierda. El ícono
 * identifica al servidor y el banner lo decora. Al pasar el mouse (o con foco) se despliega la etiqueta
 * negra con el nombre y la actividad.
 */
export function ServerStrip({
  server,
  active = false,
  unread,
  badge,
  onPress,
  onOpenMenu,
  orientation = 'vertical',
  suspended = false,
}: ServerStripProps) {
  const horizontal = orientation === 'horizontal';
  // Posición de la etiqueta (fixed): el rail scrollea y una etiqueta absoluta quedaría recortada
  const [open, setOpen] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const menuTrigger = useContextMenuTrigger(onOpenMenu);
  const show = () => {
    if (horizontal) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) setOpen({ top: rect.top, left: rect.right });
  };
  // Suspendido no tiene actividad: no se puede leer ni escribir
  const activity = suspended ? null : typeof unread === 'string' ? unread : unread ? 'Actividad nueva' : null;
  const ariaLabel = suspended
    ? `Servidor ${server.name}, suspendido`
    : activity
      ? `Servidor ${server.name}, ${activity.toLowerCase()}`
      : `Servidor ${server.name}`;

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${active ? styles.active : ''} ${horizontal ? styles.horizontal : ''} ${suspended ? styles.suspended : ''}`}
      onMouseEnter={() => show()}
      onMouseLeave={() => setOpen(null)}
    >
      <button
        type="button"
        className={styles.strip}
        aria-label={ariaLabel}
        aria-current={active ? 'true' : undefined}
        onClick={onPress}
        {...menuTrigger}
        onFocus={() => show()}
        onBlur={() => setOpen(null)}
      >
        {server.banner && <img src={server.banner} alt="" className={styles.banner} />}
        <span className={styles.icon}>
          <ServerIcon server={server} />
        </span>
        {suspended ? (
          <span className={styles.suspendedTag} data-testid="server-suspended" aria-hidden="true">
            suspended
          </span>
        ) : (
          unread && (
            <span className={styles.unread} data-testid="server-unread" aria-hidden="true">
              {badge}
            </span>
          )
        )}
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
            {suspended && <span className={`${styles.activity} ${styles.suspendedActivity}`}>Suspendido</span>}
            {activity && <span className={styles.activity}>{activity}</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
