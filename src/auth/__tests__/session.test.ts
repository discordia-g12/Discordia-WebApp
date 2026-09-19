import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useSession,
  bootstrap,
  retryBootstrap,
  logout,
  registerQueryCacheCleaner,
  setAuthProvider,
} from '../session';
import * as usersApi from '../../api/users';
import { ApiError } from '../../api/errors';
import { auth0Provider } from '../auth0';

describe('Session Store & Bootstrap State Machine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAuthProvider(auth0Provider);
    window.history.replaceState({}, '', '/');
    useSession.setState({
      status: 'bootstrapping',
      profile: null,
      error: null,
      isMock: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('protege contra StrictMode ejecutando un único flujo de inicialización ante dos bootstrap() concurrentes', async () => {
    const getTokenSpy = vi.spyOn(auth0Provider, 'getToken').mockResolvedValue('token-123');
    vi.spyOn(usersApi, 'getMyProfile').mockResolvedValue({
      id: 'u1',
      username: 'alex',
      displayName: 'Alex',
      status: 'online',
    });

    await Promise.all([retryBootstrap(), bootstrap()]);

    expect(getTokenSpy).toHaveBeenCalledTimes(1);
    expect(useSession.getState().status).toBe('authenticated');
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

  it('marca unauthenticated sin redirect si silent auth falla estando en /login', async () => {
    window.history.replaceState({}, '', '/login');

    vi.spyOn(auth0Provider, 'getToken').mockRejectedValue(new Error('login_required'));
    const redirectSpy = vi.spyOn(auth0Provider, 'loginRedirect');

    await retryBootstrap();

    expect(redirectSpy).not.toHaveBeenCalled();
    expect(useSession.getState().status).toBe('unauthenticated');
  });

  it('auto-aprovisiona el perfil si el backend responde 404 en getMyProfile', async () => {
    window.history.replaceState({}, '', '/');

    vi.spyOn(auth0Provider, 'getToken').mockResolvedValue('valid-token');
    vi.spyOn(auth0Provider, 'getUser').mockResolvedValue({
      nickname: 'newuser',
      email: 'new@example.com',
      picture: 'https://pic.com/avatar.png',
    });
    vi.spyOn(usersApi, 'getMyProfile').mockRejectedValue(
      new ApiError({ status: 404, detail: 'User profile not found' })
    );
    const upsertSpy = vi.spyOn(usersApi, 'upsertMyProfile').mockResolvedValue({
      id: 'u-auto',
      username: 'newuser',
      displayName: 'newuser',
      avatarUrl: 'https://pic.com/avatar.png',
      status: 'online',
    });

    await retryBootstrap();

    expect(upsertSpy).toHaveBeenCalledWith({
      username: 'newuser',
      display_name: 'newuser',
      avatar_url: 'https://pic.com/avatar.png',
    });
    expect(useSession.getState().status).toBe('authenticated');
    expect(useSession.getState().profile?.username).toBe('newuser');
  });

  it('pasa a needs_profile si el auto-aprovisionamiento tiene conflicto 409', async () => {
    window.history.replaceState({}, '', '/');

    vi.spyOn(auth0Provider, 'getToken').mockResolvedValue('valid-token');
    vi.spyOn(auth0Provider, 'getUser').mockResolvedValue({ nickname: 'taken' });
    vi.spyOn(usersApi, 'getMyProfile').mockRejectedValue(
      new ApiError({ status: 404, detail: 'User profile not found' })
    );
    vi.spyOn(usersApi, 'upsertMyProfile').mockRejectedValue(
      new ApiError({ status: 409, detail: 'Username taken' })
    );

    await retryBootstrap();

    expect(useSession.getState().status).toBe('needs_profile');
  });

  it('pasa a error ante fallos de servidor (5xx) o red en getMyProfile, nunca unauthenticated por defecto', async () => {
    window.history.replaceState({}, '', '/');

    vi.spyOn(auth0Provider, 'getToken').mockResolvedValue('valid-token');
    vi.spyOn(usersApi, 'getMyProfile').mockRejectedValue(
      new ApiError({ status: 500, detail: 'Internal Server Error' })
    );

    await retryBootstrap();

    expect(useSession.getState().status).toBe('error');
  });

  it('logout() limpia el caché de React Query y coloca estado unauthenticated', async () => {
    const clearQueryCacheMock = vi.fn();
    registerQueryCacheCleaner(clearQueryCacheMock);
    const logoutSpy = vi.spyOn(auth0Provider, 'logout').mockResolvedValue();

    useSession.setState({
      status: 'authenticated',
      profile: { id: 'u1', username: 'alex', displayName: 'Alex', status: 'online' },
    });

    await logout();

    expect(clearQueryCacheMock).toHaveBeenCalledTimes(1);
    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(useSession.getState().status).toBe('unauthenticated');
    expect(useSession.getState().profile).toBeNull();
  });

  it('CA 1 Login: loginWithCredentials autentica credenciales y carga el perfil del usuario', async () => {
    const loginSpy = vi.spyOn(auth0Provider, 'loginWithCredentials').mockResolvedValue();
    vi.spyOn(auth0Provider, 'getToken').mockResolvedValue('token-cred-123');
    vi.spyOn(usersApi, 'getMyProfile').mockResolvedValue({
      id: 'u-cred',
      username: 'usuario_valido',
      displayName: 'Usuario Valido',
      status: 'online',
    });

    const { loginWithCredentials } = await import('../session');
    await loginWithCredentials({ email: 'usuario@discordia.com', password: 'Password123!' });

    expect(loginSpy).toHaveBeenCalledWith({ email: 'usuario@discordia.com', password: 'Password123!' });
    expect(useSession.getState().status).toBe('authenticated');
    expect(useSession.getState().profile?.username).toBe('usuario_valido');
  });

  it('CA 1 Registro: signupWithCredentials registra la cuenta, aprovisiona perfil y accede a la plataforma', async () => {
    const signupSpy = vi.spyOn(auth0Provider, 'signupWithCredentials').mockResolvedValue();
    vi.spyOn(auth0Provider, 'getToken').mockResolvedValue('token-reg-123');
    vi.spyOn(auth0Provider, 'getUser').mockResolvedValue({
      email: 'nuevo@discordia.com',
      nickname: 'nuevousuario',
    });
    vi.spyOn(usersApi, 'getMyProfile').mockRejectedValue(
      new ApiError({ status: 404, detail: 'Not found' })
    );
    const upsertSpy = vi.spyOn(usersApi, 'upsertMyProfile').mockResolvedValue({
      id: 'u-reg-123',
      username: 'nuevousuario',
      displayName: 'Nuevo Usuario',
      status: 'online',
    });

    const { signupWithCredentials } = await import('../session');
    await signupWithCredentials({
      email: 'nuevo@discordia.com',
      password: 'Password123!',
      username: 'nuevousuario',
      displayName: 'Nuevo Usuario',
    });

    expect(signupSpy).toHaveBeenCalledWith({
      email: 'nuevo@discordia.com',
      password: 'Password123!',
      username: 'nuevousuario',
      displayName: 'Nuevo Usuario',
    });
    expect(upsertSpy).toHaveBeenCalled();
    expect(useSession.getState().status).toBe('authenticated');
    expect(useSession.getState().profile?.username).toBe('nuevousuario');
  });
});
