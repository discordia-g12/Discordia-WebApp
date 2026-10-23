import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMotionPreset } from './motion';
import styles from './DisplayText.module.css';

interface DisplayTextProps {
  children: ReactNode;
  /**
   * nav: palabras gigantes que navegan (INICIAR SESIÓN / REGISTRARSE, el menú de ajustes).
   * watermark: marca de agua cortada al pie de la barra lateral con el contexto ("AMIGOS", el servidor).
   */
  variant?: 'nav' | 'watermark';
  /** nav: la palabra de la vista actual (en el color del texto; las demás, en gris). */
  active?: boolean;
  /** nav: con onPress es un botón. */
  onPress?: () => void;
  /** watermark: tinta (inicio), cielo (servidor) o gris (en llamada). */
  tone?: 'ink' | 'sky' | 'muted';
}

/** Texto gigante del rediseño: navegación o marca de agua. */
export function DisplayText({ children, variant = 'nav', active = false, onPress, tone = 'ink' }: DisplayTextProps) {
  const sweep = useMotionPreset('sweep');

  if (variant === 'watermark') {
    // Al cambiar de contexto la palabra nueva entra con un barrido; la anterior sale hacia el otro lado
    return (
      <div className={`${styles.watermark} ${styles[tone]}`} aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={String(children)} className={styles.watermarkText} {...sweep}>
            {children}
          </motion.span>
        </AnimatePresence>
      </div>
    );
  }

  const className = `${styles.nav} ${active ? styles.active : ''}`;
  if (onPress) {
    return (
      <button type="button" className={`${className} ${styles.button}`} onClick={onPress} aria-current={active ? 'page' : undefined}>
        {children}
      </button>
    );
  }
  return <span className={className}>{children}</span>;
}
