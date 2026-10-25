import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryBootstrap, setAuthAdapter, useSession } from '@discordia/core';
import { auth0Provider } from '../auth0';
import '../session';

/**
 * Ganchos del adaptador web sobre la sesión de core: callback de Universal Login, redirección
 * silenciosa a Auth0 y limpieza de la URL. La máquina de estados común se prueba en packages/core.
 */
describe('Sesión web (Auth0 SPA)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAuthAdapter(auth0Provider);
    window.history.replaceState({}, '', '/');
    useSession.setState({
      status: 'bootstrapping',
      profile: null,
      error: null,
      isMock: false,
      pendingEmail: null,
    });
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('procesa el callback de Auth0 y no reintenta redirects si falla con login_required (anti-loop)', async () => {
    window.history.replaceState({}, '', '/callback');

    const handleCallbackSpy = vi
      .spyOn(auth0Provider, 'handleCallback')
      .mockRejectedValue(new Error('login_required'));
    const loginRedirectSpy = vi.spyOn(auth0Provider, 'loginRedirect');

    await retryBootstrap();

    expect(handleCallbackSpy).toHaveBeenCalledTimes(1);
    expect(loginRedirectSpy).not.toHaveBeenCalled(); // Anti-loop: Cero redirects adicionales
    expect(useSession.getState().status).toBe('unauthenticated');
  });

  it('marca estado suspended si Auth0 responde con access_denied', async () => {
    window.history.replaceState({}, '', '/app');

    vi.spyOn(auth0Provider, 'getToken').mockRejectedValue(
      new Error('access_denied: user is blocked')
    );

    await retryBootstrap();

    expect(useSession.getState().status).toBe('suspended');
  });

  it('dispara el fallback C (loginRedirect silent: true) si silent auth falla en una ruta protegida', async () => {
    window.history.replaceState({}, '', '/channels/c1');

    vi.spyOn(auth0Provider, 'getToken').mockRejectedValue(
      new Error('login_required: Consent required')
    );
    const redirectSpy = vi.spyOn(auth0Provider, 'loginRedirect').mockResolvedValue();

    await retryBootstrap();

    expect(redirectSpy).toHaveBeenCalledWith({
      silent: true,
      returnTo: '/channels/c1',
    });
  });

  it('pasa a error (con reintento) si falla la sesión en una ruta protegida por algo que no es login_required', async () => {
    window.history.replaceState({}, '', '/channels/c1');

    vi.spyOn(auth0Provider, 'getToken').mockRejectedValue(new Error('network down'));
    const redirectSpy = vi.spyOn(auth0Provider, 'loginRedirect');

    await retryBootstrap();

    expect(redirectSpy).not.toHaveBeenCalled();
    expect(useSession.getState().status).toBe('error');
    expect(useSession.getState().error?.detail).toBe('network down');
  });

  it('marca unauthenticated sin redirect si silent auth falla estando en /login', async () => {
    window.history.replaceState({}, '', '/login');

    vi.spyOn(auth0Provider, 'getToken').mockRejectedValue(new Error('login_required'));
    const redirectSpy = vi.spyOn(auth0Provider, 'loginRedirect');

    await retryBootstrap();

    expect(redirectSpy).not.toHaveBeenCalled();
    expect(useSession.getState().status).toBe('unauthenticated');
  });

  it('callback de Universal Login con access_denied/email_not_verified -> email_unverified y limpia la URL', async () => {
    window.history.replaceState({}, '', '/callback?error=access_denied&error_description=email_not_verified&state=xyz');
    vi.spyOn(auth0Provider, 'handleCallback').mockRejectedValue(
      Object.assign(new Error('email_not_verified'), { error: 'access_denied', error_description: 'email_not_verified' }),
    );

    await retryBootstrap();

    expect(useSession.getState().status).toBe('email_unverified');
    expect(window.location.pathname).toBe('/login');
    expect(window.location.search).toBe('');
  });

  it('callback con access_denied por otro motivo -> suspended y también limpia la URL', async () => {
    window.history.replaceState({}, '', '/callback?error=access_denied&error_description=user%20is%20blocked&state=xyz');
    vi.spyOn(auth0Provider, 'handleCallback').mockRejectedValue(
      Object.assign(new Error('user is blocked'), { error: 'access_denied', error_description: 'user is blocked' }),
    );

    await retryBootstrap();

    expect(useSession.getState().status).toBe('suspended');
    expect(window.location.search).toBe('');
  });

  it('el username elegido al registrarse se guarda en sessionStorage hasta crear el perfil', () => {
    auth0Provider.pendingProfile!.save({ username: 'cyber_knight', displayName: 'Cyber' });

    expect(sessionStorage.getItem('discordia_pending_username')).toBe('cyber_knight');
    expect(auth0Provider.pendingProfile!.take()).toEqual({ username: 'cyber_knight', displayName: 'Cyber' });
    expect(sessionStorage.getItem('discordia_pending_username')).toBeNull();
  });
});
