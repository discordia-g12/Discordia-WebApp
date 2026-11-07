import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureClient, request } from '../../api/client';
import { ApiError, NetworkError, PROBLEM_TYPES } from '../../api/errors';
import { markAccountSuspended, useSession } from '../../auth/session';
import { platformAccountLabel, suspensionErrorMessage, toPlatformAccount } from '../userSuspensions';

function problem(status: number, type?: string) {
  return new Response(JSON.stringify({ type, title: 'x', status, detail: 'x' }), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });
}

describe('cuenta suspendida por la plataforma', () => {
  const fetchMock = vi.fn();
  const onAccountSuspended = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'token', onAuthFailure: () => {}, onAccountSuspended });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    onAccountSuspended.mockReset();
  });

  it('un 403 account-suspended de la API avisa que la cuenta está suspendida', async () => {
    fetchMock.mockResolvedValue(problem(403, PROBLEM_TYPES.ACCOUNT_SUSPENDED));

    await expect(request('GET', '/api/v1/servers')).rejects.toBeInstanceOf(ApiError);
    expect(onAccountSuspended).toHaveBeenCalledTimes(1);
  });

  it('otro 403 no', async () => {
    fetchMock.mockResolvedValue(problem(403));

    await expect(request('GET', '/api/v1/servers')).rejects.toBeInstanceOf(ApiError);
    expect(onAccountSuspended).not.toHaveBeenCalled();
  });

  it('la sesión pasa a "suspendida" una sola vez, aunque fallen varios pedidos a la vez', () => {
    useSession.setState({ status: 'authenticated', isMock: false, role: 'user' });
    const setStatus = vi.spyOn(useSession.getState(), 'setStatus');

    markAccountSuspended();
    markAccountSuspended();

    expect(useSession.getState().status).toBe('suspended');
    expect(useSession.getState().profile).toBeNull();
    expect(setStatus).toHaveBeenCalledTimes(1);
  });
});

describe('cuentas en el backoffice', () => {
  const raw = {
    user_id: 'auth0|u1',
    username: 'tomasv',
    display_name: 'Tomás',
    email: 'tomas@mail.com',
    is_suspended: true,
    suspended_at: '2026-11-03T12:00:00Z',
    suspended_by: 'auth0|staff',
    suspension_reason: 'spam',
    created_at: '2026-03-01T00:00:00Z',
  };

  it('pasa la respuesta de Auth-User a camelCase', () => {
    expect(toPlatformAccount(raw)).toEqual({
      userId: 'auth0|u1',
      username: 'tomasv',
      displayName: 'Tomás',
      email: 'tomas@mail.com',
      isSuspended: true,
      suspendedAt: '2026-11-03T12:00:00Z',
      suspendedBy: 'auth0|staff',
      suspensionReason: 'spam',
      createdAt: '2026-03-01T00:00:00Z',
    });
  });

  it('muestra nombre y @usuario, o el email si no tiene perfil', () => {
    expect(platformAccountLabel({ displayName: 'Tomás', username: 'tomasv', email: 'x' })).toBe('Tomás (@tomasv)');
    expect(platformAccountLabel({ displayName: null, username: 'tomasv', email: 'x' })).toBe('@tomasv');
    expect(platformAccountLabel({ displayName: null, username: null, email: 'a@b.com' })).toBe('a@b.com');
  });

  it('explica cada error según la acción', () => {
    const api = (status: number, type?: string) => new ApiError({ status, type });
    expect(suspensionErrorMessage(api(404), 'suspend')).toBe('No hay ninguna cuenta con ese email, @usuario o id.');
    expect(suspensionErrorMessage(api(404), 'reactivate')).toBe('Esa cuenta ya no existe.');
    expect(suspensionErrorMessage(api(409), 'suspend')).toBe('Esa cuenta ya está suspendida.');
    expect(suspensionErrorMessage(api(409), 'reactivate')).toBe('Esa cuenta ya no estaba suspendida.');
    expect(suspensionErrorMessage(api(401), 'list')).toBe('Tu sesión venció, volvé a iniciar sesión.');
    expect(suspensionErrorMessage(api(403, PROBLEM_TYPES.STAFF_ONLY), 'suspend')).toMatch(/permisos de staff/);
    expect(suspensionErrorMessage(api(403, PROBLEM_TYPES.ACCOUNT_SUSPENDED), 'suspend')).toBe('Tu propia cuenta está suspendida.');
    expect(suspensionErrorMessage(new NetworkError(), 'list')).toMatch(/conexión/);
    expect(suspensionErrorMessage(api(500), 'list')).toBe('No pudimos traer las cuentas suspendidas.');
  });
});
