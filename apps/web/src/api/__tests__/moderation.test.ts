import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { ApiError } from '../errors';
import { banErrorMessage, banMember, getServerBans, unbanErrorMessage, unbanMember } from '../moderation';
import type { ServerBanBackendResponse } from '../../types';

function backendBan(overrides: Partial<ServerBanBackendResponse> = {}): ServerBanBackendResponse {
  return {
    id: 'ban-1',
    server_id: 'srv-1',
    user_id: 'auth0|user-1',
    banned_by: 'owner',
    reason: 'spam',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function apiError(status: number) {
  return new ApiError({ status, title: `Error HTTP ${status}` });
}

describe('moderación', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    configureClient({
      baseUrl: 'http://localhost:8000',
      getToken: vi.fn<any>().mockResolvedValue('jwt-token'),
      onAuthFailure: vi.fn<any>(),
      timeoutMs: 500,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lista los baneos del servidor en camelCase', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([backendBan()]));
    globalThis.fetch = fetchMock;

    const bans = await getServerBans('srv-1');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/servers/srv-1/bans');
    expect(bans).toEqual([
      {
        id: 'ban-1',
        serverId: 'srv-1',
        userId: 'auth0|user-1',
        bannedBy: 'owner',
        reason: 'spam',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('banea con POST mandando el usuario y el motivo sin espacios', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(backendBan(), 201));
    globalThis.fetch = fetchMock;

    const ban = await banMember('srv-1', 'auth0|user-1', '  spam  ');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1/bans');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ user_id: 'auth0|user-1', reason: 'spam' });
    expect(ban.userId).toBe('auth0|user-1');
  });

  it('no manda motivo si quedó vacío', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(backendBan({ reason: null }), 201));
    globalThis.fetch = fetchMock;

    await banMember('srv-1', 'user-1', '   ');

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ user_id: 'user-1' });
  });

  it('revoca el baneo con DELETE y codifica el id del usuario', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;

    await unbanMember('srv-1', 'auth0|user-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1/bans/auth0%7Cuser-1');
    expect(init.method).toBe('DELETE');
  });

  it('propaga el 403 si el usuario no tiene permisos de moderación', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: 'Missing required permission: BAN_MEMBERS' }, 403));

    await expect(unbanMember('srv-1', 'user-1')).rejects.toMatchObject({ status: 403 });
  });
});

describe('mensajes de error de moderación', () => {
  it('traduce los errores al banear según el código', () => {
    expect(banErrorMessage(apiError(403))).toContain('Ban Members');
    expect(banErrorMessage(apiError(409))).toBe('Ese usuario ya está baneado.');
    expect(banErrorMessage(new Error('boom'))).toBe('No se pudo banear al miembro.');
  });

  it('traduce los errores al revocar según el código', () => {
    expect(unbanErrorMessage(apiError(403))).toBe('No tenés permiso para revocar baneos en este servidor.');
    expect(unbanErrorMessage(apiError(404))).toBe('Ese usuario ya no está baneado.');
    expect(unbanErrorMessage(new Error('boom'))).toBe('No se pudo revocar el baneo.');
  });
});
