import { palette, type ColorScheme } from './colors';

/**
 * Degradés del rediseño, en un formato neutro que la web pasa a CSS y mobile a react-native-svg
 * (LinearGradient / RadialGradient, con offsets y radios en fracciones).
 */

export interface GradientStop {
  color: string;
  /** Posición, de 0 a 1. */
  at: number;
}

export interface LinearGradient {
  type: 'linear';
  /** Ángulo CSS en grados: 180 = de arriba hacia abajo. */
  angle: number;
  stops: GradientStop[];
}

export interface RadialGradient {
  type: 'radial';
  /** Centro y radios en fracciones del ancho (x) y del alto (y) de la caja; pueden caer afuera. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  stops: GradientStop[];
}

export type Gradient = LinearGradient | RadialGradient;

// Geometría de los degradés de la intro (svg/gradiente 1 y 2, artboard de 1443 × 1020): centro arriba
// del borde superior, como un sol que todavía no salió.
const DAWN_GEOMETRY = { cx: 0.53, cy: -0.3, rx: 1.07, ry: 1.51 };

/** Intro, primer cuadro: negro con un resplandor celeste en los bordes de abajo (gradiente 1). */
const night: RadialGradient = {
  type: 'radial',
  ...DAWN_GEOMETRY,
  stops: [
    { color: palette.black, at: 0.5 },
    { color: '#060708', at: 0.76 },
    { color: palette.night900, at: 0.8 },
    { color: palette.night800, at: 0.84 },
    { color: '#3c4f56', at: 0.91 },
    { color: '#6e8f9c', at: 0.96 },
    { color: palette.sky100, at: 1 },
  ],
};

/** Intro, cuadro final: el resplandor sube y llena la pantalla (gradiente 2). */
const dawn: RadialGradient = {
  type: 'radial',
  ...DAWN_GEOMETRY,
  stops: [
    { color: palette.black, at: 0.28 },
    { color: '#182023', at: 0.33 },
    { color: '#556f79', at: 0.45 },
    { color: '#81a9b8', at: 0.55 },
    { color: '#9dcde0', at: 0.63 },
    { color: palette.sky100, at: 0.67 },
    { color: '#edeef0', at: 1 },
  ],
};

export interface SchemeGradients {
  /** Fondo de la app. */
  background: Gradient;
  /** Fondo de auth: resplandor desde arriba al centro (págs. 3 a 5 del PDF). */
  backgroundGlow: Gradient;
}

export const gradients: { intro: { night: RadialGradient; dawn: RadialGradient } } & Record<ColorScheme, SchemeGradients> = {
  intro: { night, dawn },
  light: {
    background: {
      type: 'linear',
      angle: 180,
      stops: [
        { color: palette.sky100, at: 0 },
        { color: palette.sky200, at: 0.25 },
        { color: palette.sky300, at: 0.5 },
        { color: palette.sky400, at: 0.75 },
        { color: palette.paper, at: 1 },
      ],
    },
    backgroundGlow: {
      type: 'radial',
      cx: 0.5,
      cy: 0,
      rx: 0.9,
      ry: 1.1,
      stops: [
        { color: palette.sky200, at: 0 },
        { color: palette.sky300, at: 0.45 },
        { color: palette.paper, at: 1 },
      ],
    },
  },
  dark: {
    background: {
      type: 'linear',
      angle: 180,
      stops: [
        { color: palette.night900, at: 0 },
        { color: palette.night800, at: 1 },
      ],
    },
    // Como la intro: el resplandor celeste queda abajo
    backgroundGlow: {
      type: 'radial',
      cx: 0.5,
      cy: 1.1,
      rx: 0.9,
      ry: 0.6,
      stops: [
        { color: 'rgba(168, 219, 239, 0.35)', at: 0 },
        { color: 'rgba(14, 18, 20, 0)', at: 1 },
      ],
    },
  },
};
