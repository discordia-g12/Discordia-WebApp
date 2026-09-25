import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { ApiError } from '../errors';
import {
  DEFAULT_ROLE_COLOR,
  bitmaskToPermissions,
  createRole,
  deleteRole,
  getRoles,
  mapRoleFromBackend,
} from '../roles';
import type { RoleBackendResponse } from '../../types';

const DEFAULT_BITMASK = 113345; // permisos por defecto del backend (@everyone)

function backendRole(overrides: Partial<RoleBackendResponse> = {}): RoleBackendResponse {
  return {
    id: 'role-1',
    name: 'Moderator',
    color: '#5865f2',
    position: 1,
    permissions_bitmask: DEFAULT_BITMASK,
    is_default: false,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('bitmaskToPermissions', () => {
  it('devuelve una lista vacía para un bitmask en cero', () => {
    expect(bitmaskToPermissions(0)).toEqual([]);
  });

  it('decodifica los permisos por defecto del backend', () => {
    expect(bitmaskToPermissions(DEFAULT_BITMASK).sort()).toEqual(
      [
        'VIEW_CHANNELS',
        'CREATE_INSTANT_INVITE',
        'CHANGE_NICKNAME',
        'SEND_MESSAGES',
        'EMBED_LINKS',
        'ATTACH_FILES',
        'ADD_REACTIONS',
        'CONNECT',
        'SPEAK',
      ].sort()
    );
  });

  it('decodifica ADMINISTRATOR (bit 20)', () => {
    expect(bitmaskToPermissions(1 << 20)).toEqual(['ADMINISTRATOR']);
  });
});

describe('mapRoleFromBackend', () => {
  it('convierte snake_case a camelCase y decodifica los permisos', () => {
    const role = mapRoleFromBackend(backendRole({ is_default: true, position: 0 }));

    expect(role.id).toBe('role-1');
    expect(role.name).toBe('Moderator');
    expect(role.color).toBe('#5865f2');
    expect(role.position).toBe(0);
    expect(role.isDefault).toBe(true);
    expect(role.permissions).toContain('SEND_MESSAGES');
  });

  it('usa un color por defecto cuando el backend devuelve null', () => {
    expect(mapRoleFromBackend(backendRole({ color: null })).color).toBe(DEFAULT_ROLE_COLOR);
  });
});

describe('API de roles', () => {
  let mockGetToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetToken = vi.fn<any>().mockResolvedValue('jwt-token');
    configureClient({
      baseUrl: 'http://localhost:8000',
      getToken: mockGetToken,
      onAuthFailure: vi.fn<any>(),
      timeoutMs: 500,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getRoles hace GET a los roles del servidor y los mapea', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([backendRole({ id: 'r0', name: '@everyone', is_default: true }), backendRole()])
    );
    globalThis.fetch = fetchMock;

    const roles = await getRoles('srv-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1/roles');
    expect(init.method).toBe('GET');
    expect(init.headers['Authorization']).toBe('Bearer jwt-token');
    expect(roles.map((r) => r.name)).toEqual(['@everyone', 'Moderator']);
    expect(roles[0].isDefault).toBe(true);
  });

  it('createRole hace POST con el nombre recortado y el color', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(backendRole({ name: 'VIP' }), 201));
    globalThis.fetch = fetchMock;

    const role = await createRole('srv-1', { name: '  VIP  ', color: '#eb459e' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1/roles');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ name: 'VIP', color: '#eb459e' });
    expect(role.name).toBe('VIP');
  });

  it('createRole manda color null cuando no se elige uno', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(backendRole(), 201));
    globalThis.fetch = fetchMock;

    await createRole('srv-1', { name: 'Sin color' });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: 'Sin color', color: null });
  });

  it('createRole propaga un ApiError si el backend rechaza (403)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: 'You do not have permissions to manage roles in this server.' }, 403));

    await expect(createRole('srv-1', { name: 'X' })).rejects.toBeInstanceOf(ApiError);
  });

  it('deleteRole hace DELETE al rol y tolera la respuesta 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;

    await expect(deleteRole('srv-1', 'role-9')).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1/roles/role-9');
    expect(init.method).toBe('DELETE');
  });

  it('deleteRole propaga un ApiError si se intenta borrar el rol por defecto (400)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: 'Cannot delete the default server role.' }, 400));

    await expect(deleteRole('srv-1', 'role-0')).rejects.toBeInstanceOf(ApiError);
  });
});
