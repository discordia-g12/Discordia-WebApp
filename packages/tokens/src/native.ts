import { colors, type ColorScheme } from './colors';
import { gradients } from './gradients';
import { fontFamily, textStyles, type TextStyleName } from './typography';
import { layout, lines, radius, space } from './layout';
import { distances, durations, easings, reducedMotion } from './motion';

/** Estilo de texto listo para StyleSheet de React Native. */
export interface NativeTextStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform: 'uppercase' | 'none';
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Salida para mobile: el theme que reemplaza src/theme/* (paso 13). Los textos gigantes usan su
 * tamaño mínimo (pantallas de teléfono). No se define fontWeight: en React Native cada peso es una
 * familia distinta (fontFamily), y combinar los dos en Android elige otra fuente.
 */
export function nativeTheme(scheme: ColorScheme = 'light') {
  const text = Object.fromEntries(
    Object.entries(textStyles).map(([name, style]) => {
      const size = 'minSize' in style ? style.minSize : style.size;
      const nativeStyle: NativeTextStyle = {
        fontFamily: fontFamily.native[style.weight],
        fontSize: size,
        lineHeight: Math.round(size * style.lineHeight),
        letterSpacing: round(style.letterSpacing * size),
        textTransform: 'uppercase' in style && style.uppercase ? 'uppercase' : 'none',
      };
      return [name, nativeStyle];
    })
  ) as Record<TextStyleName, NativeTextStyle>;

  return {
    scheme,
    colors: colors[scheme],
    gradients: { ...gradients[scheme], intro: gradients.intro },
    fonts: fontFamily.native,
    text,
    space,
    lines,
    radius,
    layout,
    motion: { durations, easings, distances, reducedMotion },
  };
}

export type NativeTheme = ReturnType<typeof nativeTheme>;
