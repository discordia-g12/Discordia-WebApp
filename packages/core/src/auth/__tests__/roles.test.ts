import { describe, it, expect, vi, afterEach } from 'vitest';
import { ROLE_CLAIM, roleFromAccessToken } from '../auth0';
import { isPlatformStaff } from '../roles';
import { logout, retryBootstrap, setAuthAdapter, useSession } from '../session';
import type { AuthAdapter } from '../adapter';
import * as usersApi from '../../api/users';

/** Access token de prueba (sin firma): el cliente solo lee los claims, la firma la valida Kong. */
const tokenWith = (claims: Record<string, unknown>) => ['e30', btoa(JSON.stringify(claims)), 'firma'].join('.');

const adapterWithToken = (token: string): AuthAdapter => ({
  getToken: async () => token,
  getUser: async () => undefined,
  loginWithCredentials: async () => {},
  signupWithCredentials: async () => {},
  logout: async () => {},
});

describe('rol de plataforma', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lee el rol del access token, con "user" por defecto como Kong', () => {
    expect(roleFromAccessToken(tokenWith({ sub: 'a', [ROLE_CLAIM]: 'staff' }))).toBe('staff');
    expect(roleFromAccessToken(tokenWith({ sub: 'a' }))).toBe('user');
    expect(roleFromAccessToken('no-es-un-jwt')).toBe('user');
    expect(roleFromAccessToken(undefined)).toBe('user');
  });

  it('isPlatformStaff solo con el rol "staff"', () => {
    expect(isPlatformStaff('staff')).toBe(true);
    expect(isPlatformStaff('user')).toBe(false);
    expect(isPlatformStaff(null)).toBe(false);
  });

  it('la sesión guarda el rol al autenticarse y lo borra al cerrar sesión', async () => {
    setAuthAdapter(adapterWithToken(tokenWith({ sub: 'auth0|1', [ROLE_CLAIM]: 'staff' })));
    vi.spyOn(usersApi, 'getMyProfile').mockResolvedValue({ id: 'u1', username: 'alex', displayName: 'Alex', status: 'online' });

    await retryBootstrap();
    expect(useSession.getState().status).toBe('authenticated');
    expect(useSession.getState().role).toBe('staff');

    await logout();
    expect(useSession.getState().role).toBeNull();
  });

  it('un token sin el claim deja la sesión como "user"', async () => {
    setAuthAdapter(adapterWithToken(tokenWith({ sub: 'auth0|2' })));
    vi.spyOn(usersApi, 'getMyProfile').mockResolvedValue({ id: 'u2', username: 'bea', displayName: 'Bea', status: 'online' });

    await retryBootstrap();
    expect(useSession.getState().status).toBe('authenticated');
    expect(useSession.getState().role).toBe('user');
  });
});
