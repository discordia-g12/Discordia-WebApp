import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Server } from '../types';
import { useMotionPreset } from './motion';
import styles from './ServerStrip.module.css';

interface ServerStripProps {
  server: Pick<Server, 'name'> & { iconUrl?: string; icon?: string; banner?: string };
  active?: boolean;
  /** Actividad nueva: "NEW ACTIVITY IN GENERAL" en la etiqueta, y una marca en la franja. */
  unread?: string | boolean;
  onPress?: () => void;
}

/**
 * Servidor en el rail: una franja rectangular con su imagen. Al pasar el mouse (o con foco) se despliega
 * la etiqueta negra con el nombre y la actividad.
 */
export function ServerStrip({ server, active = false, unread, onPress }: ServerStripProps) {
  const [open, setOpen] = useState(false);
  const fade = useMotionPreset('fade');
  const image = server.banner || server.iconUrl || server.icon;
  const activity = typeof unread === 'string' ? unread : unread ? 'Actividad nueva' : null;

  return (
    <div
      className={`${styles.root} ${active ? styles.active : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={styles.strip}
        aria-label={`Servidor ${server.name}`}
        aria-current={active ? 'true' : undefined}
        onClick={onPress}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {image ? <img src={image} alt="" className={styles.image} /> : <span className={styles.placeholder}>{server.name.slice(0, 2)}</span>}
        {unread && <span className={styles.unread} aria-hidden="true" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className={styles.label} role="tooltip" {...fade}>
            <span className={styles.name}>: {server.name}</span>
            {activity && <span className={styles.activity}>{activity}</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
