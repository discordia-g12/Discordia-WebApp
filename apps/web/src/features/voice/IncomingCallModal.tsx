import { useId } from 'react';
import { motion } from 'motion/react';
import type { User } from '../../types';
import { SquareAvatar, useMotionPreset } from '../../ui';
import styles from './IncomingCallModal.module.css';

export interface IncomingCallModalProps {
  caller: User;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Llamada entrante (rediseño): bloque invertido abajo a la derecha que entra desde abajo, con quien
 * llama, _rechazar y ACEPTAR. No tapa la app: se puede seguir usando mientras suena.
 */
export function IncomingCallModal({ caller, onAccept, onDecline }: IncomingCallModalProps) {
  const enter = useMotionPreset('toast');
  const titleId = useId();
  const name = caller.displayName || caller.username;

  return (
    <motion.div className={styles.call} role="alertdialog" aria-labelledby={titleId} {...enter}>
      <p className={styles.label}>Llamada entrante /</p>
      <div className={styles.caller}>
        <SquareAvatar user={caller} size={40} />
        <div>
          <p id={titleId} className={styles.name}>
            {name}
          </p>
          <p className={styles.meta}>te está llamando/</p>
        </div>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.decline} onClick={onDecline}>
          _rechazar
        </button>
        {/* Sin autoFocus: la llamada puede llegar mientras se escribe, y un Enter no tiene que atenderla */}
        <button type="button" className={styles.accept} onClick={onAccept}>
          Aceptar /
        </button>
      </div>
    </motion.div>
  );
}
