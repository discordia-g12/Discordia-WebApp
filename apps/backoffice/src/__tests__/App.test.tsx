import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient, ROLE_CLAIM } from '@discordia/core';
import App from '../App';
import type { AuthDriver } from '../auth/driver';
import { setAuthDriver, useBackofficeSession } from '../auth/session';
import { grafanaLinks } from '../sections/grafana';

/** Access token de prueba (sin firma): el cliente solo lee el claim de rol, la firma la valida Kong. */
const tokenWith = (role: string) => ['e30', btoa(JSON.stringify({ sub: 'auth0|1', [ROLE_CLAIM]: role })), 'firma'].join('.');

function fakeDriver(start: () => Promise<string | null>): AuthDriver {
  return {
    start,
    getToken: async () => tokenWith('staff'),
    getUser: async () => ({ name: 'Ana Staff', email: 'ana@discordia.lol' }),
    loginWithPassword: async () => tokenWith('staff'),
    loginWithGoogle: async () => 'done',
    requestPasswordReset: async () => {},
    isTwoFactorEnabled: async () => false,
    verifyTwoFactor: async () => ({ valid: true, recoveryCodeUsed: false }),
    logout: async () => 'done',
  };
}

/** Como en main.tsx: las secciones usan React Query (p. ej. las cuentas suspendidas en Usuarios). */
function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

describe('backoffice', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    useBackofficeSession.setState({ status: 'loading', user: null, error: null });
    // Usuarios y Servidores piden su listado (paginado) y sus suspendidos al abrir: sin ninguno
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const paged = String(url).includes('/admin/users?') || String(url).includes('/admin/servers?');
        const body = paged ? { items: [], total: 0, page: 1, page_size: 25 } : [];
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      }),
    );
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'token', onAuthFailure: () => {} });
  });

  afterEach(() => {
    cleanup();
    setAuthDriver(null);
    vi.unstubAllGlobals();
  });

  it('el staff ve el backoffice: Usuarios ya funciona y lo que falta dice "próximamente"', async () => {
    setAuthDriver(fakeDriver(async () => tokenWith('staff')));
    renderApp();

    expect(await screen.findByRole('navigation', { name: 'Secciones del backoffice' })).toBeTruthy();
    // "/" lleva a la primera sección
    await waitFor(() => expect(window.location.pathname).toBe('/usuarios'));
    expect(screen.getByText('Ana Staff')).toBeTruthy();
    expect(await screen.findByText('todavía no hay cuentas')).toBeTruthy();
    expect(screen.queryByText('próximamente')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /servidores/i }));
    expect(screen.queryByText('próximamente')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /expedientes/i }));
    expect(screen.getAllByText('próximamente').length).toBeGreaterThan(0);
  });

  it('cada sección tiene su URL y Observabilidad enlaza a Grafana', async () => {
    setAuthDriver(fakeDriver(async () => tokenWith('staff')));
    renderApp();

    fireEvent.click(await screen.findByRole('button', { name: /observabilidad/i }));
    expect(window.location.pathname).toBe('/observabilidad');

    const links = grafanaLinks();
    expect(links.resources).toMatch(/\/d\/discordia-recursos$/);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(links.home);
    expect(hrefs).toContain(links.resources);
    expect(screen.queryByText('próximamente')).toBeNull();
  });

  it('una ruta que no es de ninguna sección muestra "no encontrada" y lleva a Usuarios', async () => {
    window.history.replaceState({}, '', '/no-existe');
    setAuthDriver(fakeDriver(async () => tokenWith('staff')));
    renderApp();

    // Mientras arranca la sesión se ve el acceso (con su propio encabezado): esperar el 404
    expect(await screen.findByText('error 404/')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Página no encontrada');
    expect(screen.queryByRole('navigation', { name: 'Secciones del backoffice' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^Ir a Usuarios/ }));

    expect(await screen.findByRole('navigation', { name: 'Secciones del backoffice' })).toBeTruthy();
    expect(window.location.pathname).toBe('/usuarios');
  });

  it('una cuenta sin el rol staff no ve el backoffice', async () => {
    setAuthDriver(fakeDriver(async () => tokenWith('user')));
    renderApp();

    expect(await screen.findByText('Esta cuenta no es staff de la plataforma.')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Secciones del backoffice' })).toBeNull();
  });

  it('si la Action de Auth0 rechaza el login, tampoco', async () => {
    setAuthDriver(
      fakeDriver(async () => {
        throw Object.assign(new Error('access_denied'), { error: 'access_denied', error_description: 'staff_only' });
      }),
    );
    renderApp();

    expect(await screen.findByText('Esta cuenta no es staff de la plataforma.')).toBeTruthy();
  });

  it('sin sesión muestra el formulario de acceso, con Google', async () => {
    setAuthDriver(fakeDriver(async () => null));
    renderApp();

    // BlockButton agrega la barra final: "Iniciar sesión /"
    expect(await screen.findByRole('button', { name: /^Iniciar sesión/ })).toBeTruthy();
    expect(screen.getByLabelText(/^correo electrónico/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeTruthy();
  });

  it('si Auth0 falla, muestra el error y permite reintentar', async () => {
    let attempts = 0;
    setAuthDriver(
      fakeDriver(async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('no se pudo conectar con Auth0');
        return tokenWith('staff');
      }),
    );
    renderApp();

    expect(await screen.findByText('No pudimos verificar tu sesión.')).toBeTruthy();
    expect(screen.getByText('/ no se pudo conectar con Auth0')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Reintentar/ }));
    expect(await screen.findByRole('navigation', { name: 'Secciones del backoffice' })).toBeTruthy();
  });

  it('salir pide confirmación: cancelar no cierra la sesión, confirmar sí', async () => {
    let logouts = 0;
    setAuthDriver({
      ...fakeDriver(async () => tokenWith('staff')),
      logout: async () => {
        logouts += 1;
        return 'done';
      },
    });
    renderApp();
    await screen.findByRole('navigation', { name: 'Secciones del backoffice' });

    fireEvent.click(screen.getByRole('button', { name: /Salir/ }));
    expect(await screen.findByRole('alertdialog', { name: '¿Cerrar sesión?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /cancelar/ }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(logouts).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: /Salir/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^Cerrar sesión/ }));
    await waitFor(() => expect(logouts).toBe(1));
    expect(await screen.findByRole('button', { name: /^Iniciar sesión/ })).toBeTruthy();
  });
});
