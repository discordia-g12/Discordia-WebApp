import { useReducedMotion, type Transition, type Variants } from 'motion/react';
import { distances, durations, easings } from '@discordia/tokens';

/**
 * Movimiento del rediseño (docs/TODO-REDISENO.md, sección 2): variantes compartidas por todos los
 * componentes, con las duraciones y curvas de @discordia/tokens. Solo transform y opacity.
 * Con prefers-reduced-motion todas se vuelven un fundido de 150 ms.
 */

export type MotionPreset = 'fade' | 'rise' | 'toast' | 'sweep' | 'curtain';

const seconds = (ms: number) => ms / 1000;

/**
 * Opacidad de partida de las entradas: 0.01 y no 0. Chrome no cuenta como pintado (FCP / LCP) lo que
 * aparece con una animación de opacidad desde 0; a la vista es lo mismo.
 */
const ENTER_OPACITY = 0.01;

export const transitions = {
  fast: { duration: seconds(durations.fast), ease: easings.standard },
  base: { duration: seconds(durations.base), ease: easings.enter },
  slow: { duration: seconds(durations.slow), ease: easings.enter },
  curtain: { duration: seconds(durations.curtain), ease: easings.enter },
  exit: { duration: seconds(durations.fast), ease: easings.exit },
  reduced: { duration: seconds(durations.instant), ease: 'linear' },
} satisfies Record<string, Transition>;

const presets: Record<MotionPreset, { variants: Variants; transition: Transition }> = {
  /** Aparecer / desaparecer. */
  fade: {
    variants: { hidden: { opacity: ENTER_OPACITY }, visible: { opacity: 1 }, exit: { opacity: 0 } },
    transition: transitions.fast,
  },
  /** Mensajes nuevos: entran subiendo unos píxeles. */
  rise: {
    variants: {
      hidden: { opacity: ENTER_OPACITY, y: distances.rise },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, transition: transitions.exit },
    },
    transition: transitions.base,
  },
  /** Avisos: entran desde abajo y bajan al irse. */
  toast: {
    variants: {
      hidden: { opacity: ENTER_OPACITY, y: distances.toast },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: distances.toast, transition: transitions.exit },
    },
    transition: transitions.base,
  },
  /** Marca de agua al cambiar de vista: barrido horizontal (el contenedor recorta con overflow). */
  sweep: {
    variants: {
      hidden: { opacity: ENTER_OPACITY, x: '-12%' },
      visible: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: '12%', transition: transitions.exit },
    },
    transition: transitions.slow,
  },
  /** Ajustes y modales: bajan desde arriba como una cortina y suben al cerrarse. */
  curtain: {
    variants: {
      hidden: { y: '-100%' },
      visible: { y: 0 },
      exit: { y: '-100%', transition: { ...transitions.curtain, ease: easings.exit } },
    },
    transition: transitions.curtain,
  },
};

const reducedVariants: Variants = presets.fade.variants;

/**
 * Props de motion para un preset: <motion.div {...useMotionPreset('rise')} />. Con movimiento reducido
 * devuelve un fundido corto en lugar del desplazamiento.
 */
export function useMotionPreset(preset: MotionPreset) {
  const reduce = useReducedMotion();
  const { variants, transition } = presets[preset];
  return {
    variants: reduce ? reducedVariants : variants,
    transition: reduce ? transitions.reduced : transition,
    initial: 'hidden',
    animate: 'visible',
    exit: 'exit',
  } as const;
}
