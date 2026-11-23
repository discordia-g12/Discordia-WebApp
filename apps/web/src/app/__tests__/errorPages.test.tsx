import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { isKnownPath } from '../routes';
import { CrashScreen, NotFoundScreen } from '../ErrorScreens';

afterEach(cleanup);

describe('rutas de la web', () => {
  it('conoce la app, el acceso, la vuelta de Auth0 y las invitaciones', () => {
    for (const path of ['/', '/login', '/callback', '/invite/h7K9xQ2', '/invite/h7K9xQ2/', '/login/']) {
      expect(isKnownPath(path), path).toBe(true);
    }
  });

  it('cualquier otra ruta es "no encontrada"', () => {
    for (const path of ['/asdf', '/invite', '/invite/', '/invite/a/b', '/channels/c1', '/callbackx']) {
      expect(isKnownPath(path), path).toBe(false);
    }
  });
});

describe('páginas de error', () => {
  it('404: dice que no existe y lleva al inicio', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    render(<NotFoundScreen />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Página no encontrada');
    expect(screen.getByText('error 404/')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Ir a Discordia/ }));
    expect(assign).toHaveBeenCalledWith('/');
    vi.unstubAllGlobals();
  });

  it('error inesperado: ofrece recargar o volver al inicio', () => {
    const reload = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload, assign });
    render(<CrashScreen error={new Error('boom')} />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Algo falló');
    fireEvent.click(screen.getByRole('button', { name: /^Recargar/ }));
    expect(reload).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '_volver al inicio' }));
    expect(assign).toHaveBeenCalledWith('/');
    vi.unstubAllGlobals();
  });
});
