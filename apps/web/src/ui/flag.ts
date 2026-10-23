/**
 * Flag del rediseño: con data-ui="nuevo" en <html> se aplican los tokens (@discordia/tokens) y los
 * componentes del catálogo. Mientras dura la migración solo se activa en desarrollo, para poder
 * mergear de a poco sin publicar una app mitad vieja y mitad nueva (Cloudflare Pages publica main).
 *
 *   ?ui=nuevo / ?ui=viejo          activa / desactiva el rediseño (se recuerda en localStorage)
 *   ?tema=oscuro|claro|sistema     modo del rediseño (también se recuerda)
 */

const UI_KEY = 'discordia_ui';
const THEME_KEY = 'discordia_theme';

const THEMES: Record<string, string> = { oscuro: 'dark', claro: 'light', sistema: 'system' };

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // storage bloqueado: el flag dura solo esta visita
  }
}

/** Lee el flag de la URL o de localStorage y lo aplica en <html>. Devuelve si quedó activo. */
export function initUiFlag(enabled: boolean = import.meta.env.DEV): boolean {
  const root = document.documentElement;
  if (!enabled) {
    delete root.dataset.ui;
    delete root.dataset.theme;
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const store = storage();

  const ui = params.get('ui');
  if (ui === 'nuevo' || ui === 'viejo') store?.setItem(UI_KEY, ui);
  const tema = params.get('tema');
  if (tema && THEMES[tema]) store?.setItem(THEME_KEY, THEMES[tema]);

  const active = (ui ?? store?.getItem(UI_KEY)) === 'nuevo';
  if (active) {
    root.dataset.ui = 'nuevo';
    const theme = (tema && THEMES[tema]) || store?.getItem(THEME_KEY);
    if (theme && theme !== 'light') root.dataset.theme = theme;
    else delete root.dataset.theme;
  } else {
    delete root.dataset.ui;
    delete root.dataset.theme;
  }
  return active;
}

/** true si el rediseño está activo en esta página. */
export function isNewUi(): boolean {
  return document.documentElement.dataset.ui === 'nuevo';
}

export type ThemePreference = 'light' | 'dark' | 'system';

/** Tema elegido en Ajustes → Experiencia (o con ?tema=). Sin elección, claro (el paso 12 lo pasa a sistema). */
export function getThemePreference(): ThemePreference {
  const saved = storage()?.getItem(THEME_KEY);
  return saved === 'dark' || saved === 'system' ? saved : 'light';
}

/** Aplica el tema en <html> (los tokens hacen el resto) y lo recuerda en este navegador. */
export function setThemePreference(theme: ThemePreference) {
  storage()?.setItem(THEME_KEY, theme);
  const root = document.documentElement;
  if (theme === 'light') delete root.dataset.theme;
  else root.dataset.theme = theme;
}
