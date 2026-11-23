import { describe, it, expect } from 'vitest';
import { colors, type ColorScheme } from '../colors';
import { gradients } from '../gradients';

/** Contraste WCAG 2.x entre dos colores hex opacos. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(bl);
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Todos los fondos sobre los que va texto: el sólido y cada parada del degradé de la app. */
function backgrounds(scheme: ColorScheme): string[] {
  return [colors[scheme].background, ...gradients[scheme].background.stops.map((stop) => stop.color)];
}

describe.each<ColorScheme>(['light', 'dark'])('contraste WCAG AA (%s)', (scheme) => {
  const c = colors[scheme];

  it.each(['text', 'textMuted', 'accent'] as const)('%s se lee como texto normal (4.5:1) sobre todo el fondo', (token) => {
    for (const bg of backgrounds(scheme)) {
      expect(contrast(c[token], bg), `${c[token]} sobre ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('las palabras gigantes inactivas cumplen como texto grande (3:1)', () => {
    for (const bg of backgrounds(scheme)) {
      expect(contrast(c.textDisplayInactive, bg), `sobre ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('el texto del bloque invertido y el del bloque de peligro se leen (4.5:1)', () => {
    expect(contrast(c.inverseText, c.inverseBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.onDanger, c.danger)).toBeGreaterThanOrEqual(4.5);
  });

  it('las líneas que marcan algo (bordes de campos y opciones, pestaña activa) se distinguen (3:1)', () => {
    for (const bg of backgrounds(scheme)) {
      expect(contrast(c.lineStrong, bg), `${c.lineStrong} sobre ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('el indicador de quién habla se distingue del fondo (3:1, componente no textual)', () => {
    for (const bg of backgrounds(scheme)) {
      expect(contrast(c.speaking, bg), `${c.speaking} sobre ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('el contorno de foco se distingue del fondo (3:1, componente no textual)', () => {
    for (const bg of backgrounds(scheme)) {
      expect(contrast(c.focus, bg), `sobre ${bg}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('gris de decoración', () => {
  it('el gris del PDF (#b8babc) no alcanza para texto: por eso queda solo para decoración', () => {
    expect(contrast(colors.light.decoration, colors.light.background)).toBeLessThan(3);
  });
});
