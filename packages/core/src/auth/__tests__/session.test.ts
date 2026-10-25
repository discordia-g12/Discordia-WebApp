import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useSession,
  bootstrap,
  retryBootstrap,
  logout,
  registerQueryCacheCleaner,
  setAuthAdapter,
  loginWithCredentials,
  signupWithCredentials,
  backToLogin,
} from '../session';
import type { AuthAdapter } from '../adapter';
import * as usersApi from '../../api/users';
import { ApiError, PROBLEM_TYPES } from '../../api/errors';
import { AccountSuspendedError, EmailNotVerifiedError } from '../errors';

/** Adaptador sin ganchos de plataforma: el comportamiento por defecto de la sesión (como en mobile). */
const adapter: AuthAdapter = {
  getToken: async () => {
    throw new Error('login_required');
  },
  getUser: async () => undefined,
  loginWithCredentials: async () => {},
  signupWithCredentials: async () => {},
  logout: async () => {},
};

function resetSession(status: 'bootstrapping' | 'unauthenticated') {
  vi.restoreAllMocks();
  setAuthAdapter(adapter);
  useSession.setState({
    status,
    profile: null,
    error: null,
    isMock: false,
    pendingEmail: null,
  });
}

describe('Session Store & Bootstrap State Machine', () => {
  beforeEach(() => resetSession('bootstrapping'));

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('protege contra StrictMode ejecutando un único flujo de inicialización ante dos bootstrap() concurrentes', async () => {
    const getTokenSpy = vi.spyOn(adapter, 'getToken').mockResolvedValue('token-123');
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

  it('sin token y sin gancho de plataforma queda unauthenticated', async () => {
    await retryBootstrap();

    expect(useSession.getState().status).toBe('unauthenticated');
  });

  it('marca estado suspended si Auth0 responde con access_denied', async () => {
    vi.spyOn(adapter, 'getToken').mockRejectedValue(
      new Error('access_denied: user is blocked')
    );

    await retryBootstrap();

    expect(useSession.getState().status).toBe('suspended');
  });

  it('auto-aprovisiona el perfil si el backend responde 404 en getMyProfile', async () => {
    vi.spyOn(adapter, 'getToken').mockResolvedValue('valid-token');
    vi.spyOn(adapter, 'getUser').mockResolvedValue({
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

  it('no usa el name de Auth0 como nombre visible cuando es el email (cuentas usuario/contraseña)', async () => {
    vi.spyOn(adapter, 'getToken').mockResolvedValue('valid-token');
    vi.spyOn(adapter, 'getUser').mockResolvedValue({
      nickname: 'newuser',
      name: 'new@example.com',
      email: 'new@example.com',
    });
    vi.spyOn(usersApi, 'getMyProfile').mockRejectedValue(
      new ApiError({ status: 404, detail: 'User profile not found' })
    );
    const upsertSpy = vi.spyOn(usersApi, 'upsertMyProfile').mockResolvedValue({
      id: 'u-auto',
      username: 'newuser',
      displayName: 'newuser',
      status: 'online',
    });

    await retryBootstrap();

    expect(upsertSpy).toHaveBeenCalledWith(expect.objectContaining({ display_name: 'newuser' }));
  });

  it('pasa a needs_profile si el auto-aprovisionamiento tiene conflicto 409', async () => {
    vi.spyOn(adapter, 'getToken').mockResolvedValue('valid-token');
    vi.spyOn(adapter, 'getUser').mockResolvedValue({ nickname: 'taken' });
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
    vi.spyOn(adapter, 'getToken').mockResolvedValue('valid-token');
    vi.spyOn(usersApi, 'getMyProfile').mockRejectedValue(
      new ApiError({ status: 500, detail: 'Internal Server Error' })
    );

    await retryBootstrap();

    expect(useSession.getState().status).toBe('error');
  });

  it('logout() limpia el caché de React Query y coloca estado unauthenticated', async () => {
    const clearQueryCacheMock = vi.fn();
    registerQueryCacheCleaner(clearQueryCacheMock);
    const logoutSpy = vi.spyOn(adapter, 'logout').mockResolvedValue();

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
    const loginSpy = vi.spyOn(adapter, 'loginWithCredentials').mockResolvedValue();
    vi.spyOn(adapter, 'getToken').mockResolvedValue('token-cred-123');
    vi.spyOn(usersApi, 'getMyProfile').mockResolvedValue({
      id: 'u-cred',
      username: 'usuario_valido',
      displayName: 'Usuario Valido',
      status: 'online',
    });

    await loginWithCredentials({ email: 'usuario@discordia.com', password: 'Password123!' });

    expect(loginSpy).toHaveBeenCalledWith({ email: 'usuario@discordia.com', password: 'Password123!' });
    expect(useSession.getState().status).toBe('authenticated');
    expect(useSession.getState().profile?.username).toBe('usuario_valido');
  });

  it('CA 1 Registro: signupWithCredentials registra la cuenta, aprovisiona perfil y accede a la plataforma', async () => {
    const signupSpy = vi.spyOn(adapter, 'signupWithCredentials').mockResolvedValue();
    vi.spyOn(adapter, 'getToken').mockResolvedValue('token-reg-123');
    vi.spyOn(adapter, 'getUser').mockResolvedValue({
      email: 'nuevo@discordia.com',
      nickname: 'otro_nick',
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
    // Sin claim en el ID token, el perfil se crea con lo elegido en el formulario (no con el nickname)
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'nuevousuario', display_name: 'Nuevo Usuario' })
    );
    expect(useSession.getState().status).toBe('authenticated');
    expect(useSession.getState().profile?.username).toBe('nuevousuario');
  });
});

describe('Verificación de email (Auth0 Action deny: email_not_verified)', () => {
  beforeEach(() => resetSession('unauthenticated'));

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('login con email sin verificar -> email_unverified con pendingEmail, sin bootstrap ni error de formulario', async () => {
    vi.spyOn(adapter, 'loginWithCredentials').mockRejectedValue(new EmailNotVerifiedError('pepe@discordia.com'));
    const getTokenSpy = vi.spyOn(adapter, 'getToken');

    await expect(
      loginWithCredentials({ email: 'pepe@discordia.com', password: 'Password123!' }),
    ).resolves.toBeUndefined();

    expect(useSession.getState().status).toBe('email_unverified');
    expect(useSession.getState().pendingEmail).toBe('pepe@discordia.com');
    expect(getTokenSpy).not.toHaveBeenCalled();
  });

  it('CA 2/CA 3 Login: credenciales inválidas siguen llegando al formulario como error', async () => {
    vi.spyOn(adapter, 'loginWithCredentials').mockRejectedValue(
      new Error('El correo electrónico o la contraseña son incorrectos.'),
    );

    await expect(loginWithCredentials({ email: 'x@discordia.com', password: 'bad' })).rejects.toThrow(
      /incorrectos/,
    );
    expect(useSession.getState().status).toBe('unauthenticated');
  });

  it('cuenta suspendida en login sigue llegando al formulario como AccountSuspendedError', async () => {
    vi.spyOn(adapter, 'loginWithCredentials').mockRejectedValue(new AccountSuspendedError());

    await expect(loginWithCredentials({ email: 'x@discordia.com', password: 'P4ssword!' })).rejects.toBeInstanceOf(
      AccountSuspendedError,
    );
  });

  it('registro exitoso + verificación pendiente -> email_unverified (no es un error del registro)', async () => {
    vi.spyOn(adapter, 'signupWithCredentials').mockRejectedValue(new EmailNotVerifiedError('nuevo@discordia.com'));
    const getTokenSpy = vi.spyOn(adapter, 'getToken');

    await expect(
      signupWithCredentials({ email: 'nuevo@discordia.com', password: 'Password123!', username: 'nuevo_user' }),
    ).resolves.toBeUndefined();

    expect(useSession.getState().status).toBe('email_unverified');
    expect(useSession.getState().pendingEmail).toBe('nuevo@discordia.com');
    expect(getTokenSpy).not.toHaveBeenCalled();
  });

  it('auto-aprovisiona con el username del claim del ID token aunque no haya estado local del registro', async () => {
    vi.spyOn(adapter, 'getToken').mockResolvedValue('token-123');
    vi.spyOn(adapter, 'getUser').mockResolvedValue({
      email: 'nuevo@discordia.com',
      nickname: 'nuevo',
      username: 'cyber_knight',
    });
    vi.spyOn(usersApi, 'getMyProfile').mockRejectedValue(new ApiError({ status: 404 }));
    const upsertSpy = vi.spyOn(usersApi, 'upsertMyProfile').mockResolvedValue({
      id: 'u1',
      username: 'cyber_knight',
      displayName: 'cyber_knight',
      status: 'online',
    });

    await retryBootstrap();

    expect(upsertSpy).toHaveBeenCalledWith(expect.objectContaining({ username: 'cyber_knight' }));
    expect(useSession.getState().status).toBe('authenticated');
  });

  it('segunda barrera: 403 email-not-verified del backend al crear el perfil -> email_unverified', async () => {
    vi.spyOn(adapter, 'getToken').mockResolvedValue('token-viejo');
    vi.spyOn(adapter, 'getUser').mockResolvedValue({ email: 'viejo@discordia.com', nickname: 'viejo' });
    vi.spyOn(usersApi, 'getMyProfile').mockRejectedValue(new ApiError({ status: 404 }));
    vi.spyOn(usersApi, 'upsertMyProfile').mockRejectedValue(
      new ApiError({ status: 403, type: PROBLEM_TYPES.EMAIL_NOT_VERIFIED, detail: 'Email address must be verified' }),
    );

    await retryBootstrap();

    expect(useSession.getState().status).toBe('email_unverified');
    expect(useSession.getState().pendingEmail).toBe('viejo@discordia.com');
  });

  it('un 403 genérico del backend al crear el perfil NO se confunde con verificación pendiente', async () => {
    vi.spyOn(adapter, 'getToken').mockResolvedValue('token-123');
    vi.spyOn(adapter, 'getUser').mockResolvedValue({ email: 'x@discordia.com', nickname: 'x_user' });
    vi.spyOn(usersApi, 'getMyProfile').mockRejectedValue(new ApiError({ status: 404 }));
    vi.spyOn(usersApi, 'upsertMyProfile').mockRejectedValue(
      new ApiError({ status: 403, type: 'about:blank', detail: 'Forbidden' }),
    );

    await retryBootstrap();

    expect(useSession.getState().status).toBe('error');
  });

  it('backToLogin conserva pendingEmail; logout lo limpia', async () => {
    useSession.setState({ status: 'email_unverified', pendingEmail: 'pepe@discordia.com' });
    vi.spyOn(adapter, 'logout').mockResolvedValue();

    backToLogin();
    expect(useSession.getState().status).toBe('unauthenticated');
    expect(useSession.getState().pendingEmail).toBe('pepe@discordia.com');

    await logout();
    expect(useSession.getState().pendingEmail).toBeNull();
  });
});
