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
  red600: '#c0392b',
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
  },
  dark: {
    background: palette.night900,
    text: palette.paper,
    textMuted: palette.gray300,
    textDisplayInactive: palette.gray350,
    decoration: '#2a3438',
    line: 'rgba(168, 219, 239, 0.2)',
    lineStrong: palette.paper,
    inverseBackground: palette.paper,
    inverseText: palette.night900,
    danger: palette.red600,
    onDanger: palette.white,
    focus: palette.paper,
    glow: palette.sky100,
  },
};
