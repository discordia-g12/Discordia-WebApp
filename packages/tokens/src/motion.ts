/**
 * Movimiento (docs/TODO-REDISENO.md, sección 2). Solo transform y opacity. Con
 * prefers-reduced-motion todo pasa a fundidos de 150 ms y la intro se omite: ver reducedMotion.
 */

/** Duraciones en ms. */
export const durations = {
  /** Fundido mínimo; también todas las transiciones con movimiento reducido. */
  instant: 150,
  /** Hover, subrayado de pestañas, colapso de secciones. */
  fast: 200,
  /** Entrada de mensajes, cambio de pestaña login / registro. */
  base: 320,
  /** Barrido de la marca de agua entre vistas. */
  slow: 480,
  /** Cortina de líneas de ajustes y modales. */
  curtain: 600,
  /** Intro "amanecer". */
  intro: 4000,
  /** Tiempo en pantalla de un toast. */
  toast: 4000,
  /** Deriva del degradé de fondo. */
  drift: 60000,
} as const;

/** Curvas cúbicas [x1, y1, x2, y2]: CSS cubic-bezier() y Easing.bezier() de React Native. */
export const easings = {
  /** Movimientos dentro de la pantalla. */
  standard: [0.2, 0, 0, 1],
  /** Entradas: arranca rápido y frena largo (cortina, barrido, intro). */
  enter: [0.16, 1, 0.3, 1],
  /** Salidas: arranca lento y se va rápido. */
  exit: [0.4, 0, 1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** Desplazamientos en px. */
export const distances = {
  /** Mensajes nuevos: entran subiendo esta distancia. */
  rise: 8,
  /** Toasts: entran desde abajo. */
  toast: 24,
} as const;

/** Lo que cambia con prefers-reduced-motion. */
export const reducedMotion = {
  durations: {
    instant: 150,
    fast: 150,
    base: 150,
    slow: 150,
    curtain: 150,
    intro: 0,
    toast: durations.toast,
    drift: 0,
  },
  distances: { rise: 0, toast: 0 },
} as const satisfies { durations: Record<keyof typeof durations, number>; distances: Record<keyof typeof distances, number> };
