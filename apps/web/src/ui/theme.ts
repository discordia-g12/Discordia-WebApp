/**
 * Tema de la app (docs/TODO-REDISENO.md, sección 1): claro, oscuro o el del sistema. Los tokens
 * (@discordia/tokens/tokens.css) resuelven los colores según data-theme en <html>.
 *
 *   ?tema=oscuro|claro|sistema     elige el tema desde la URL (se recuerda, como la elección en ajustes)
 */

const THEME_KEY = 'discordia_theme';

const THEMES: Record<string, ThemePreference> = { oscuro: 'dark', claro: 'light', sistema: 'system' };

export type ThemePreference = 'light' | 'dark' | 'system';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // storage bloqueado: la elección dura solo esta visita
  }
}

/** Aplica el tema al arrancar: el de la URL (?tema=), el guardado o, sin elección, el del sistema. */
export function initTheme() {
  const tema = new URLSearchParams(window.location.search).get('tema');
  const fromUrl = tema ? THEMES[tema] : undefined;
  if (fromUrl) storage()?.setItem(THEME_KEY, fromUrl);
  // La URL primero: con el storage bloqueado, ?tema= tiene que seguir andando en esta visita
  applyTheme(fromUrl ?? getThemePreference());
}

/** Tema elegido en Ajustes → Experiencia (o con ?tema=). Sin elección, el del sistema (prefers-color-scheme). */
export function getThemePreference(): ThemePreference {
  const saved = storage()?.getItem(THEME_KEY);
  return saved === 'dark' || saved === 'light' ? saved : 'system';
}

/** Claro es sin data-theme; oscuro y sistema lo ponen (tokens.css resuelve sistema con la media query). */
function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === 'light') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

/** Aplica el tema en <html> (los tokens hacen el resto) y lo recuerda en este navegador. */
export function setThemePreference(theme: ThemePreference) {
  storage()?.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
