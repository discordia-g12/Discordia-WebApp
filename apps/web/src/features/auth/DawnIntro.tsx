import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { durations, easings } from '@discordia/tokens';
import { Logo } from '../../ui';
import styles from './DawnIntro.module.css';

/**
 * Intro "amanecer" (docs/TODO-REDISENO.md, sección 2): negro → el resplandor celeste sube (gradiente 1
 * → gradiente 2) → se aclara y deja ver la app. Dura ~4 s, se saltea con un clic o una tecla, sale
 * solo en el primer ingreso de este navegador y se omite con movimiento reducido.
 *
 * Va encima de todo mientras la sesión arranca: debajo puede estar el login o "verificando sesión".
 */

const SEEN_KEY = 'discordia_intro_seen';

const seconds = (ms: number) => ms / 1000;

/**
 * Línea de tiempo (sobre durations.intro, 4 s): noche quieta ~0.5 s → el resplandor sube durante ~2.5 s
 * → aclara en ~1.1 s → la intro se desvanece. El resplandor y el aclarado van con entrada y salida suaves
 * (no con easings.enter, que resuelve casi todo al principio y no deja ver la subida).
 */
const RISE_EASE = [0.65, 0, 0.35, 1] as const;

function alreadySeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // storage bloqueado: la intro vuelve a salir en la próxima visita
  }
}

export function DawnIntro() {
  const reduce = useReducedMotion();
  const [playing, setPlaying] = useState(() => !alreadySeen());

  useEffect(() => {
    if (!playing) return;
    if (reduce) {
      setPlaying(false);
      return;
    }
    markSeen();

    const skip = () => setPlaying(false);
    const timer = window.setTimeout(skip, durations.intro);
    window.addEventListener('keydown', skip);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', skip);
    };
  }, [playing, reduce]);

  const total = seconds(durations.intro);

  return (
    <AnimatePresence>
      {playing && !reduce && (
        <motion.div
          className={styles.intro}
          onClick={() => setPlaying(false)}
          aria-hidden="true"
          data-testid="dawn-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: seconds(durations.curtain), ease: easings.exit } }}
        >
          {/* Primer cuadro: noche con el resplandor en los bordes de abajo */}
          <div className={`${styles.layer} ${styles.night}`} />
          {/* El resplandor sube y llena la pantalla */}
          <motion.div
            className={`${styles.layer} ${styles.dawn}`}
            initial={{ opacity: 0, y: '20%' }}
            animate={{ opacity: 1, y: '0%' }}
            transition={{ duration: total * 0.625, delay: total * 0.125, ease: RISE_EASE }}
          />
          {/* Se aclara hasta el degradé del login, que es lo que queda debajo al salir */}
          <motion.div
            className={`${styles.layer} ${styles.day}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: total * 0.275, delay: total * 0.7, ease: RISE_EASE }}
          />
          {/* La "D" aparece con el resplandor y se pierde cuando aclara */}
          <motion.div
            className={styles.logo}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: [0, 1, 0], y: 0 }}
            transition={{ duration: total * 0.7, delay: total * 0.1, ease: easings.enter, times: [0, 0.45, 1] }}
          >
            <Logo size={56} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
