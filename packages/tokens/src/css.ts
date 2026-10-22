import { colors, type ColorScheme } from './colors';
import { gradients, type Gradient } from './gradients';
import { DESIGN_WIDTH, fontFamily, textStyles } from './typography';
import { layout, lines, radius, space } from './layout';
import { distances, durations, easings, reducedMotion } from './motion';

/**
 * Salida para la web: variables CSS (tokens.css, generado con `npm run build:css`).
 *
 * - Todo vive bajo :root[data-ui="nuevo"], el flag del rediseño: sin el flag la web sigue con la
 *   paleta de Discord de index.css. Los nombres llevan prefijo por categoría (--color-, --font-,
 *   --space-, --motion-) para no chocar con los de esa paleta (--text-muted, --bg-primary).
 * - Modo oscuro con data-theme="dark", o data-theme="system" + preferencia del sistema. Sin
 *   data-theme queda el claro (el oscuro sale en el paso 12).
 * - prefers-reduced-motion: fundidos de 150 ms, sin desplazamientos y sin intro.
 */

const ROOT = ':root[data-ui="nuevo"]';

const kebab = (name: string) => name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const pct = (fraction: number) => `${Math.round(fraction * 10000) / 100}%`;
const px = (value: number) => (value === 0 ? '0' : `${value}px`);
const ms = (value: number) => `${value}ms`;

export function gradientToCss(gradient: Gradient): string {
  const stops = gradient.stops.map((stop) => `${stop.color} ${pct(stop.at)}`).join(', ');
  if (gradient.type === 'linear') {
    return `linear-gradient(${gradient.angle}deg, ${stops})`;
  }
  return `radial-gradient(${pct(gradient.rx)} ${pct(gradient.ry)} at ${pct(gradient.cx)} ${pct(gradient.cy)}, ${stops})`;
}

function fontSize(size: number, minSize?: number): string {
  if (minSize === undefined) return px(size);
  const fluid = Math.round((size / DESIGN_WIDTH) * 100 * 1000) / 1000;
  return `clamp(${px(minSize)}, ${fluid}vw, ${px(size)})`;
}

function schemeVars(scheme: ColorScheme): string[] {
  return [
    ...Object.entries(colors[scheme]).map(([name, value]) => `--color-${kebab(name)}: ${value};`),
    ...Object.entries(gradients[scheme]).map(([name, value]) => `--gradient-${kebab(name)}: ${gradientToCss(value)};`),
  ];
}

function baseVars(): string[] {
  const vars: string[] = [];

  vars.push(...Object.entries(gradients.intro).map(([name, value]) => `--gradient-intro-${kebab(name)}: ${gradientToCss(value)};`));

  vars.push(`--font-family: ${fontFamily.web};`);
  for (const [name, style] of Object.entries(textStyles)) {
    const minSize = 'minSize' in style ? style.minSize : undefined;
    vars.push(
      `--font-${kebab(name)}-size: ${fontSize(style.size, minSize)};`,
      `--font-${kebab(name)}-line-height: ${style.lineHeight};`,
      `--font-${kebab(name)}-letter-spacing: ${style.letterSpacing}em;`,
      `--font-${kebab(name)}-weight: ${style.weight};`,
      `--font-${kebab(name)}-transform: ${'uppercase' in style && style.uppercase ? 'uppercase' : 'none'};`
    );
  }

  vars.push(...Object.entries(space).map(([step, value]) => `--space-${step}: ${px(value)};`));
  vars.push(...Object.entries(lines).map(([name, value]) => `--line-${kebab(name)}: ${px(value)};`));
  vars.push(`--radius: ${px(radius)};`);

  for (const [name, value] of Object.entries(layout)) {
    if (typeof value === 'number') {
      vars.push(`--layout-${kebab(name)}: ${px(value)};`);
    } else {
      vars.push(...Object.entries(value).map(([size, v]) => `--layout-${kebab(name)}-${size}: ${px(v)};`));
    }
  }

  vars.push(...Object.entries(durations).map(([name, value]) => `--motion-duration-${kebab(name)}: ${ms(value)};`));
  vars.push(...Object.entries(easings).map(([name, value]) => `--motion-ease-${kebab(name)}: cubic-bezier(${value.join(', ')});`));
  vars.push(...Object.entries(distances).map(([name, value]) => `--motion-distance-${kebab(name)}: ${px(value)};`));

  return vars;
}

function reducedMotionVars(): string[] {
  return [
    ...Object.entries(reducedMotion.durations)
      .filter(([name, value]) => durations[name as keyof typeof durations] !== value)
      .map(([name, value]) => `--motion-duration-${kebab(name)}: ${ms(value)};`),
    ...Object.entries(reducedMotion.distances).map(([name, value]) => `--motion-distance-${kebab(name)}: ${px(value)};`),
  ];
}

function block(selector: string, vars: string[], indent = ''): string {
  const body = vars.map((v) => `${indent}  ${v}`).join('\n');
  return `${indent}${selector} {\n${body}\n${indent}}`;
}

export function buildCss(): string {
  return [
    '/* Generado desde packages/tokens/src (npm run build:css -w @discordia/tokens). No editar a mano. */',
    '',
    block(ROOT, [...baseVars(), ...schemeVars('light')]),
    '',
    block(`${ROOT}[data-theme="dark"]`, schemeVars('dark')),
    '',
    '@media (prefers-color-scheme: dark) {',
    block(`${ROOT}[data-theme="system"]`, schemeVars('dark'), '  '),
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    block(ROOT, reducedMotionVars(), '  '),
    '}',
    '',
  ].join('\n');
}
