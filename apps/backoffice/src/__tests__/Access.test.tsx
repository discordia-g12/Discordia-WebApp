import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError, AuthNetworkError, ROLE_CLAIM, StaffOnlyError, configureClient } from '@discordia/core';
import App from '../App';
import type { AuthDriver } from '../auth/driver';
import { setAuthDriver, useBackofficeSession } from '../auth/session';

/** Acceso del backoffice (ADR-03): formulario propio, Google, recupero de contraseña y 2FA. */

const tokenWith = (role: string) => ['e30', btoa(JSON.stringify({ sub: 'auth0|1', [ROLE_CLAIM]: role })), 'firma'].join('.');

/** Sin sesión al arrancar; cada prueba cambia lo que necesita. */
function driver(overrides: Partial<AuthDriver> = {}): AuthDriver {
  return {
    start: async () => null,
    getToken: async () => tokenWith('staff'),
    getUser: async () => ({ name: 'Ana Staff', email: 'ana@discordia.lol' }),
    loginWithPassword: vi.fn(async () => tokenWith('staff')),
    loginWithGoogle: vi.fn(async () => 'redirected' as const),
    requestPasswordReset: vi.fn(async () => {}),
    isTwoFactorEnabled: async () => false,
    verifyTwoFactor: async () => ({ valid: true, recoveryCodeUsed: false }),
    logout: vi.fn(async () => 'done' as const),
    ...overrides,
  };
}

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

async function fillLogin(email = 'ana@discordia.lol', password = 'secreta') {
  fireEvent.change(await screen.findByLabelText(/^correo electrónico/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/^contraseña/), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /^Iniciar sesión/ }));
}

const backoffice = () => screen.findByRole('navigation', { name: 'Secciones del backoffice' });

describe('acceso al backoffice', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    useBackofficeSession.setState({ status: 'loading', user: null, error: null });
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

  describe('con email y contraseña', () => {
    it('un staff entra al backoffice', async () => {
      const d = driver();
      setAuthDriver(d);
      renderApp();

      await fillLogin();

      expect(await backoffice()).toBeTruthy();
      expect(d.loginWithPassword).toHaveBeenCalledWith({ email: 'ana@discordia.lol', password: 'secreta' });
    });

    it('con credenciales incorrectas muestra el mensaje genérico y no entra', async () => {
      setAuthDriver(
        driver({
          loginWithPassword: async () => {
            throw new Error('El correo electrónico o la contraseña son incorrectos.');
          },
        }),
      );
      renderApp();

      await fillLogin();

      expect((await screen.findByRole('alert')).textContent).toBe('/ El correo electrónico o la contraseña son incorrectos.');
      expect(screen.queryByRole('navigation', { name: 'Secciones del backoffice' })).toBeNull();
    });

    it('sin email válido no le pregunta nada a Auth0', async () => {
      const d = driver();
      setAuthDriver(d);
      renderApp();

      await fillLogin('no-es-un-email', 'secreta');

      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(d.loginWithPassword).not.toHaveBeenCalled();
    });

    it('si Auth0 no responde lo dice, no culpa a las credenciales', async () => {
      setAuthDriver(
        driver({
          loginWithPassword: async () => {
            throw new AuthNetworkError();
          },
        }),
      );
      renderApp();

      await fillLogin();

      expect((await screen.findByRole('alert')).textContent).toContain('No se pudo conectar con el servidor de autenticación');
    });

    it('una cuenta que no es staff (la Action responde staff_only) ve "sin acceso"', async () => {
      setAuthDriver(
        driver({
          loginWithPassword: async () => {
            throw new StaffOnlyError();
          },
        }),
      );
      renderApp();

      await fillLogin();

      expect(await screen.findByText('Esta cuenta no es staff de la plataforma.')).toBeTruthy();
    });
  });

  it('Google redirige por Auth0 con la conexión de Google', async () => {
    const d = driver();
    setAuthDriver(d);
    renderApp();

    fireEvent.click(await screen.findByRole('button', { name: 'Continuar con Google' }));

    await waitFor(() => expect(d.loginWithGoogle).toHaveBeenCalledTimes(1));
  });

  it('recuperar la contraseña manda el mail y permite volver', async () => {
    const d = driver();
    setAuthDriver(d);
    renderApp();

    fireEvent.click(await screen.findByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    fireEvent.change(screen.getByLabelText(/^correo electrónico/), { target: { value: 'ana@discordia.lol' } });
    fireEvent.click(screen.getByRole('button', { name: /^Enviar enlace/ }));

    await waitFor(() => expect(d.requestPasswordReset).toHaveBeenCalledWith('ana@discordia.lol'));
    fireEvent.click(await screen.findByRole('button', { name: /^Volver/ }));
    expect(await screen.findByRole('button', { name: /^Iniciar sesión/ })).toBeTruthy();
  });

  describe('2FA', () => {
    it('con la 2FA activa pide el código antes de mostrar el backoffice', async () => {
      const verify = vi.fn(async (code: string) => ({ valid: code === '123456', recoveryCodeUsed: false }));
      setAuthDriver(driver({ isTwoFactorEnabled: async () => true, verifyTwoFactor: verify }));
      renderApp();

      await fillLogin();
      const codeInput = await screen.findByLabelText(/^código de verificación/);
      expect(screen.queryByRole('navigation', { name: 'Secciones del backoffice' })).toBeNull();

      fireEvent.change(codeInput, { target: { value: '000000' } });
      fireEvent.click(screen.getByRole('button', { name: /^Verificar código/ }));
      expect((await screen.findByRole('alert')).textContent).toContain('Código de verificación incorrecto');

      fireEvent.change(codeInput, { target: { value: '123456' } });
      fireEvent.click(screen.getByRole('button', { name: /^Verificar código/ }));

      expect(await backoffice()).toBeTruthy();
      expect(verify).toHaveBeenLastCalledWith('123456', tokenWith('staff'));
    });

    it('un 400 de Auth-User al verificar es un código incorrecto', async () => {
      setAuthDriver(
        driver({
          isTwoFactorEnabled: async () => true,
          verifyTwoFactor: async () => {
            throw new ApiError({ status: 400, detail: 'invalid code' });
          },
        }),
      );
      renderApp();

      await fillLogin();
      fireEvent.change(await screen.findByLabelText(/^código de verificación/), { target: { value: '111111' } });
      fireEvent.click(screen.getByRole('button', { name: /^Verificar código/ }));

      expect((await screen.findByRole('alert')).textContent).toBe('/ Código de verificación incorrecto o expirado.');
    });

    it('también al volver con la sesión de Google (al recargar)', async () => {
      setAuthDriver(driver({ start: async () => tokenWith('staff'), isTwoFactorEnabled: async () => true }));
      renderApp();

      expect(await screen.findByLabelText(/^código de verificación/)).toBeTruthy();
    });

    it('si no se puede consultar la 2FA no entra (no se saltea el segundo factor)', async () => {
      setAuthDriver(
        driver({
          isTwoFactorEnabled: async () => {
            throw new Error('Auth-User caído');
          },
        }),
      );
      renderApp();

      await fillLogin();

      expect(await screen.findByText(/No pudimos verificar la autenticación en dos factores/)).toBeTruthy();
      expect(screen.queryByRole('navigation', { name: 'Secciones del backoffice' })).toBeNull();
    });

    it('volver cierra la sesión pendiente y vuelve al formulario', async () => {
      const d = driver({ isTwoFactorEnabled: async () => true });
      setAuthDriver(d);
      renderApp();

      await fillLogin();
      await screen.findByLabelText(/^código de verificación/);
      fireEvent.click(screen.getByRole('button', { name: /^Volver/ }));

      await waitFor(() => expect(d.logout).toHaveBeenCalled());
      expect(await screen.findByRole('button', { name: /^Iniciar sesión/ })).toBeTruthy();
    });
  });
});
