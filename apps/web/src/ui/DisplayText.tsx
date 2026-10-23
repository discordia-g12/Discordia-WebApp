import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { distances } from '@discordia/tokens';
import { transitions, useMotionPreset } from './motion';
import styles from './DisplayText.module.css';

interface DisplayTextProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> {
  children: ReactNode;
  /**
   * nav: palabras gigantes que navegan (INICIAR SESIÓN / REGISTRARSE, el menú de ajustes).
   * watermark: marca de agua cortada al pie de la barra lateral con el contexto ("AMIGOS", el servidor).
   */
  variant?: 'nav' | 'watermark';
  /** nav: la palabra de la vista actual (en el color del texto; las demás, en gris). */
  active?: boolean;
  /** nav: con onPress es un botón (el resto de las props van al <button>). */
  onPress?: () => void;
  /** watermark: tinta (inicio), cielo (servidor) o gris (en llamada). */
  tone?: 'ink' | 'sky' | 'muted';
}

/** Texto gigante del rediseño: navegación o marca de agua. */
export function DisplayText({ children, variant = 'nav', active = false, onPress, tone = 'ink', className: extraClass, ...rest }: DisplayTextProps) {
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

  const className = `${styles.nav} ${active ? styles.active : ''} ${extraClass ?? ''}`;
  const content = typeof children === 'string' ? <RisingLetters text={children} active={active} /> : children;
  if (onPress) {
    return (
      <button type="button" className={`${className} ${styles.button}`} onClick={onPress} aria-current={active ? 'page' : undefined} {...rest}>
        {content}
      </button>
    );
  }
  return <span className={className}>{content}</span>;
}

/**
 * Cuando la palabra pasa a ser la activa, sus letras suben una tras otra mientras se oscurece. No anima
 * al montarse (solo al cambiar), ni con movimiento reducido. Las letras sueltas son decorativas: el
 * texto entero queda en un span oculto para los lectores de pantalla y las búsquedas por texto.
 */
function RisingLetters({ text, active }: { text: string; active: boolean }) {
  const reduce = useReducedMotion();
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

  const rise = mounted.current && active && !reduce;
  let index = 0;

  return (
    <>
      <span className={styles.srOnly}>{text}</span>
      {/* La clave cambia al activarse: las letras se vuelven a montar y arrancan desde abajo */}
      <span key={active ? 'on' : 'off'} aria-hidden="true">
        {text.split(' ').map((word, w) => (
          <span key={w}>
            {w > 0 && ' '}
            <span className={styles.word}>
              {Array.from(word).map((letter) => {
                const i = index++;
                return (
                  <motion.span
                    key={i}
                    className={styles.letter}
                    initial={rise ? { opacity: 0, y: distances.rise * 2 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...transitions.base, delay: i * 0.018 }}
                  >
                    {letter}
                  </motion.span>
                );
              })}
            </span>
          </span>
        ))}
      </span>
    </>
  );
}
