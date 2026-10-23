import { motion } from 'motion/react';
import { ActionLink } from './ActionLink';
import { useMotionPreset } from './motion';
import styles from './Toast.module.css';

interface ToastProps {
  /** Se muestra con barra final: "Mensaje enviado/". */
  message: string;
  /** error: borde izquierdo rojo de 4 px. */
  tone?: 'default' | 'error';
  /** Acción en el toast (p. ej. reintentar un envío). */
  action?: { label: string; onPress: () => void };
}

/**
 * Aviso: tira negra al pie con texto claro. Entra desde abajo; cuánto dura y dónde se apila lo decide
 * quien lo muestra (AnimatePresence alrededor para la salida).
 */
export function Toast({ message, tone = 'default', action }: ToastProps) {
  const enter = useMotionPreset('toast');
  return (
    <motion.div role={tone === 'error' ? 'alert' : 'status'} className={`${styles.toast} ${tone === 'error' ? styles.error : ''}`} {...enter}>
      <span>{message}/</span>
      {action && (
        <ActionLink onPress={action.onPress} className={styles.action}>
          {action.label}
        </ActionLink>
      )}
    </motion.div>
  );
}
