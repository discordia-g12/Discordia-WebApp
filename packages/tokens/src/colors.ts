/**
 * Colores del rediseño (docs/TODO-REDISENO.md, sección 1). Los grises del PDF que no llegan a WCAG AA
 * sobre el cielo están oscurecidos; el contraste de cada par texto/fondo lo verifica
 * src/__tests__/contrast.test.ts.
 */

export type ColorScheme = 'light' | 'dark';

/** Valores sueltos, sin significado: los usan los tokens semánticos y los degradés. */
export const palette = {
  ink: '#312f34',
  black: '#000000',
  paper: '#f2f2f0',
  white: '#ffffff',
  sky100: '#a8dbef',
  sky200: '#b3deef',
  sky300: '#d5e9ef',
  sky400: '#eaefef',
  night900: '#0e1214',
  night800: '#1a2225',
  gray500: '#50565c',
  gray450: '#6b7177',
  gray300: '#9aa0a6',
  gray350: '#7d858c',
  gray200: '#b8babc',
  /** Líneas fuertes de noche: celeste apagado (el blanco de la tinta se veía duro sobre la noche). */
  slate400: '#6b8794',
  /** Celeste decorativo de noche: la marca de agua de un servidor, tan sutil como el cielo de día. */
  slate800: '#2b4550',
  /** Celeste oscuro: el celeste del cielo con contraste de texto sobre el día. */
  sky700: '#14607f',
  red600: '#c0392b',
  /** Verde de "hablando" de día: oscuro para llegar a 3:1 también sobre el celeste del degradé. */
  green700: '#15803d',
  /** Verde de "hablando" de noche: brillante, se ve sobre la noche y sobre fotos o video. */
  green400: '#4ade80',
} as const;

export interface SemanticColors {
  /** Fondo sólido (debajo del degradé, y donde no hay degradé). */
  background: string;
  text: string;
  /** Texto chico inactivo y metadatos. AA texto normal sobre todo el degradé. */
  textMuted: string;
  /** Palabras gigantes inactivas (≥ 24px). AA texto grande. */
  textDisplayInactive: string;
  /** Solo decoración (marca de agua, líneas): nunca texto que haya que leer. */
  decoration: string;
  /** Líneas de la grilla (1px). */
  line: string;
  /** Líneas que marcan algo (subrayado de la pestaña activa, campo enfocado). */
  lineStrong: string;
  /** Bloque invertido: barra de usuario, etiqueta del rail, botón primario. */
  inverseBackground: string;
  inverseText: string;
  /** Solo para bloques y bordes de acciones destructivas; nunca como texto chico sobre el cielo. */
  danger: string;
  onDanger: string;
  /** Contorno de foco (2px). */
  focus: string;
  /** Resplandor celeste (intro, pie del degradé de noche). */
  glow: string;
  /** Tinte celeste del fondo en un servidor (barra lateral). En oscuro, apenas un velo. */
  skyTint: string;
  /** Celeste decorativo (marca de agua de un servidor): nunca texto que haya que leer. */
  skyDecoration: string;
  /**
   * Quién está hablando en una llamada (borde de su ficha). Tiene que distinguirse de las líneas de la
   * grilla y verse sobre fotos y video: por eso es el único color saturado de la paleta.
   */
  speaking: string;
  /** Texto que tiene que llamar la atención (resumen de un hilo, a quién se responde). AA texto normal. */
  accent: string;
}

export const colors: Record<ColorScheme, SemanticColors> = {
  light: {
    background: palette.paper,
    text: palette.ink,
    textMuted: palette.gray500,
    textDisplayInactive: palette.gray450,
    decoration: palette.gray200,
    line: 'rgba(49, 47, 52, 0.25)',
    lineStrong: palette.ink,
    inverseBackground: palette.black,
    inverseText: palette.paper,
    danger: palette.red600,
    onDanger: palette.white,
    focus: palette.ink,
    glow: palette.sky100,
    skyTint: 'rgba(168, 219, 239, 0.3)',
    skyDecoration: palette.sky100,
    speaking: palette.green700,
    accent: palette.sky700,
  },
  dark: {
    background: palette.night900,
    text: palette.paper,
    textMuted: palette.gray300,
    textDisplayInactive: palette.gray350,
    decoration: '#2a3438',
    line: 'rgba(168, 219, 239, 0.2)',
    lineStrong: palette.slate400,
    inverseBackground: palette.paper,
    inverseText: palette.night900,
    danger: palette.red600,
    onDanger: palette.white,
    focus: palette.paper,
    glow: palette.sky100,
    skyTint: 'rgba(168, 219, 239, 0.06)',
    skyDecoration: palette.slate800,
    speaking: palette.green400,
    accent: palette.sky100,
  },
};
