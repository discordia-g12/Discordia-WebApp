import { useEffect, useLayoutEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { distances, textStyles } from '@discordia/tokens';
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
  const watermarkRef = useRef<HTMLDivElement>(null);
  useFitWidth(watermarkRef, variant === 'watermark' ? String(children) : null);

  if (variant === 'watermark') {
    // Al cambiar de contexto la palabra nueva entra con un barrido; la anterior sale hacia el otro lado
    return (
      <div ref={watermarkRef} className={`${styles.watermark} ${styles[tone]}`} aria-hidden="true">
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

/** Por debajo de este tamaño en un renglón, la marca de agua parte en renglones por palabra. */
const WATERMARK_ONE_LINE_MIN_PX = 48;
/** Tamaño mínimo: por debajo, una palabra muy larga se corta a la derecha. */
const WATERMARK_MIN_PX = 28;

let measureContext: OffscreenCanvasRenderingContext2D | null | undefined;

/**
 * Ancho de un texto a 100 px con la tipografía de la marca de agua (canvas: no depende del DOM ni de la
 * palabra que está saliendo con el barrido). null si el navegador no puede medir (jsdom).
 */
function widthAt100(text: string, element: HTMLElement): number | null {
  if (measureContext === undefined) {
    // OffscreenCanvas: no toca el DOM (y jsdom no lo tiene, así que en los tests no se mide)
    measureContext = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1).getContext('2d') : null;
  }
  const ctx = measureContext;
  if (!ctx) return null;
  const { fontFamily } = getComputedStyle(element);
  const { weight, letterSpacing, uppercase } = textStyles.watermark;
  ctx.font = `${weight} 100px ${fontFamily}`;
  ctx.letterSpacing = `${letterSpacing * 100}px`;
  return ctx.measureText(uppercase ? text.toUpperCase() : text).width;
}

/**
 * Ajusta la marca de agua al ancho de la columna para que se lea entera: en un renglón, achicándola
 * hasta su tamaño del token; si así queda por debajo de WATERMARK_ONE_LINE_MIN_PX (un nombre largo),
 * parte en renglones por palabra con el tamaño que hace entrar a la palabra más larga. Se recalcula
 * al cambiar la palabra, el ancho o al terminar de cargar la fuente. El tamaño va en --watermark-size
 * y los renglones con data-wrap (ver DisplayText.module.css).
 */
function useFitWidth(ref: React.RefObject<HTMLDivElement | null>, text: string | null) {
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box || text === null) return;

    let lastWidth = -1;
    const fit = () => {
      // El tamaño máximo es el font-size de la caja (el token, que escala con clamp())
      const style = getComputedStyle(box);
      const max = parseFloat(style.fontSize);
      const available = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const fitting = (t: string) => {
        const w100 = widthAt100(t, box);
        return w100 ? Math.floor((available / w100) * 100) : null;
      };
      const oneLine = fitting(text);
      if (oneLine === null || available <= 0) return;

      const words = text.split(/\s+/).filter(Boolean);
      // Quien la usa puede bajar el umbral para partir en renglones (el encabezado de mobile)
      const oneLineMin = parseFloat(style.getPropertyValue('--watermark-one-line-min')) || WATERMARK_ONE_LINE_MIN_PX;
      const wrap = oneLine < oneLineMin && words.length > 1;
      const target = wrap ? Math.min(...words.map((w) => fitting(w) ?? oneLine)) : oneLine;
      box.style.setProperty('--watermark-size', `${Math.min(max, Math.max(WATERMARK_MIN_PX, target))}px`);
      box.toggleAttribute('data-wrap', wrap);
    };
    // Solo los cambios de ancho: el alto cambia con el propio ajuste
    const onResize = () => {
      if (box.clientWidth === lastWidth) return;
      lastWidth = box.clientWidth;
      fit();
    };

    fit();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(box);
    document.fonts?.ready.then(fit);
    return () => observer?.disconnect();
  }, [ref, text]);
}
