import { AnimatePresence, motion } from 'motion/react';
import { useMotionPreset } from './motion';
import styles from './ConnectionBanner.module.css';

/**
 * Banner de conexión (docs/TODO-REDISENO.md, sección 3): una línea de 2 px arriba de toda la app que
 * avanza en loop mientras se reconecta. Con movimiento reducido, la línea queda quieta.
 */
export function ConnectionBanner({ active }: { active: boolean }) {
  const fade = useMotionPreset('fade');
  return (
    <AnimatePresence>
      {active && (
        <motion.div className={styles.banner} role="status" {...fade}>
          <span className={styles.srOnly}>Reconectando</span>
          <span className={styles.bar} aria-hidden="true" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
