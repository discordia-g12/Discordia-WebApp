import { describe, it, expect, beforeEach } from 'vitest';
import { initUiFlag, isNewUi } from '../flag';

const html = document.documentElement;

function visit(search: string) {
  window.history.replaceState({}, '', `/${search}`);
}

describe('flag del rediseño (data-ui)', () => {
  beforeEach(() => {
    localStorage.clear();
    delete html.dataset.ui;
    delete html.dataset.theme;
    visit('');
  });

  it('?ui=nuevo lo activa y lo recuerda en las visitas siguientes', () => {
    visit('?ui=nuevo');
    expect(initUiFlag(true)).toBe(true);
    expect(html.dataset.ui).toBe('nuevo');

    visit('');
    expect(initUiFlag(true)).toBe(true);
    expect(isNewUi()).toBe(true);
  });

  it('?ui=viejo lo apaga', () => {
    localStorage.setItem('discordia_ui', 'nuevo');
    visit('?ui=viejo');

    expect(initUiFlag(true)).toBe(false);
    expect(html.dataset.ui).toBeUndefined();
  });

  it('?tema=oscuro pone el modo noche; claro no deja data-theme', () => {
    visit('?ui=nuevo&tema=oscuro');
    initUiFlag(true);
    expect(html.dataset.theme).toBe('dark');

    visit('?tema=claro');
    initUiFlag(true);
    expect(html.dataset.theme).toBeUndefined();
  });

  it('sin elección, sigue el tema del sistema', () => {
    visit('?ui=nuevo');
    initUiFlag(true);
    expect(html.dataset.theme).toBe('system');
  });

  it('fuera de desarrollo no se activa aunque la URL lo pida', () => {
    visit('?ui=nuevo');

    expect(initUiFlag(false)).toBe(false);
    expect(html.dataset.ui).toBeUndefined();
  });
});

describe('preferencia de tema', () => {
  it('se aplica en <html> y se recuerda', async () => {
    const { getThemePreference, setThemePreference } = await import('../flag');
    setThemePreference('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(getThemePreference()).toBe('dark');

    setThemePreference('light');
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(getThemePreference()).toBe('light');
  });
});
