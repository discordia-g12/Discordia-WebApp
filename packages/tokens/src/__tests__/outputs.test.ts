import { describe, it, expect } from 'vitest';
import { buildCss, gradientToCss } from '../css';
import { nativeTheme } from '../native';
import { colors } from '../colors';
import { textStyles } from '../typography';

describe('tokens.css', () => {
  // tokens.css está versionado (la web lo importa sin paso de build). Si este test falla, regenerarlo con
  // `npm run build:css -w @discordia/tokens` y commitearlo junto con el cambio de tokens.
  it('está al día con los tokens', async () => {
    await expect(buildCss()).toMatchFileSnapshot('../../tokens.css');
  });

  it('todo queda detrás del flag del rediseño y el oscuro solo con data-theme', () => {
    const css = buildCss();
    const selectors = css.match(/^\s*[:@][^{]*\{/gm)?.map((s) => s.trim()) ?? [];
    expect(selectors).toEqual([
      ':root[data-ui="nuevo"] {',
      ':root[data-ui="nuevo"][data-theme="dark"] {',
      '@media (prefers-color-scheme: dark) {',
      ':root[data-ui="nuevo"][data-theme="system"] {',
      '@media (prefers-reduced-motion: reduce) {',
      ':root[data-ui="nuevo"] {',
    ]);
  });

  it('no reutiliza nombres de la paleta de Discord de index.css', () => {
    const css = buildCss();
    expect(css).not.toMatch(/--(text-muted|text-normal|bg-primary|brand)\s*:/);
    expect(css).toContain('--color-text-muted: #50565c;');
  });

  it('los textos gigantes escalan con el viewport entre su mínimo y su máximo', () => {
    expect(buildCss()).toContain('--font-display-size: clamp(36px, 3.889vw, 56px);');
    expect(buildCss()).toContain('--font-body-size: 15px;');
  });

  it('pasa los degradés a CSS', () => {
    expect(gradientToCss({ type: 'linear', angle: 180, stops: [{ color: '#000', at: 0 }, { color: '#fff', at: 1 }] })).toBe(
      'linear-gradient(180deg, #000 0%, #fff 100%)'
    );
    expect(
      gradientToCss({ type: 'radial', cx: 0.53, cy: -0.3, rx: 1.07, ry: 1.51, stops: [{ color: '#000', at: 0.5 }] })
    ).toBe('radial-gradient(107% 151% at 53% -30%, #000 50%)');
  });

  it('con movimiento reducido acorta las transiciones, quita los desplazamientos y la intro', () => {
    const reduced = buildCss().split('@media (prefers-reduced-motion: reduce)')[1];
    expect(reduced).toContain('--motion-duration-base: 150ms;');
    expect(reduced).toContain('--motion-duration-intro: 0ms;');
    expect(reduced).toContain('--motion-distance-rise: 0;');
    expect(reduced).not.toContain('--motion-duration-toast');
  });
});

describe('nativeTheme', () => {
  it('usa la familia de cada peso, sin fontWeight, y el tamaño mínimo de los textos gigantes', () => {
    const theme = nativeTheme();
    expect(theme.text.display).toEqual({
      fontFamily: 'SchibstedGrotesk_400Regular',
      fontSize: textStyles.display.minSize,
      lineHeight: Math.round(textStyles.display.minSize * textStyles.display.lineHeight),
      letterSpacing: -0.72,
      textTransform: 'uppercase',
    });
    expect(theme.text.label.fontFamily).toBe('SchibstedGrotesk_700Bold');
    expect(theme.text.body.fontSize).toBe(15);
    expect(theme.text.body).not.toHaveProperty('fontWeight');
  });

  it('elige la paleta según el esquema', () => {
    expect(nativeTheme('dark').colors).toBe(colors.dark);
    expect(nativeTheme('light').colors.inverseBackground).toBe('#000000');
    expect(nativeTheme().radius).toBe(0);
  });
});
