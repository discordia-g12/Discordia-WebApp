import { describe, it, expect, beforeEach } from 'vitest';
import { getThemePreference, initTheme, setThemePreference } from '../theme';

const html = document.documentElement;

function visit(search: string) {
  window.history.replaceState({}, '', `/${search}`);
}

describe('tema', () => {
  beforeEach(() => {
    localStorage.clear();
    delete html.dataset.theme;
    visit('');
  });

  it('sin elección, sigue el tema del sistema', () => {
    initTheme();
    expect(html.dataset.theme).toBe('system');
  });

  it('?tema=oscuro pone el modo noche y se recuerda; claro no deja data-theme', () => {
    visit('?tema=oscuro');
    initTheme();
    expect(html.dataset.theme).toBe('dark');

    visit('');
    initTheme();
    expect(html.dataset.theme).toBe('dark');

    visit('?tema=claro');
    initTheme();
    expect(html.dataset.theme).toBeUndefined();
  });

  it('la elección de los ajustes se aplica en <html> y se recuerda', () => {
    setThemePreference('dark');
    expect(html.dataset.theme).toBe('dark');
    expect(getThemePreference()).toBe('dark');

    setThemePreference('light');
    expect(html.dataset.theme).toBeUndefined();
    expect(getThemePreference()).toBe('light');
  });
});
