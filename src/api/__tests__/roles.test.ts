import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { ApiError } from '../errors';
import {
  DEFAULT_ROLE_COLOR,
  bitmaskToPermissions,
  createRole,
  deleteRole,
  getRoleMembers,
  getRoles,
  mapRoleFromBackend,
  permissionsToBitmask,
  setDefaultRole,
  updateRoleInfo,
  updateRolePermissions,
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

describe('permissionsToBitmask', () => {
  it('devuelve 0 para una lista vacía', () => {
    expect(permissionsToBitmask([])).toBe(0);
  });

  it('es la inversa de bitmaskToPermissions', () => {
    expect(permissionsToBitmask(bitmaskToPermissions(DEFAULT_BITMASK))).toBe(DEFAULT_BITMASK);
    expect(permissionsToBitmask(bitmaskToPermissions(1 << 20))).toBe(1 << 20);
  });

  it('ignora ids sin bit en el backend (VIEW_AUDIT_LOG, STREAM)', () => {
    expect(permissionsToBitmask(['SEND_MESSAGES', 'VIEW_AUDIT_LOG', 'STREAM'])).toBe(1 << 9);
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

  it('getRoleMembers hace GET a los miembros del rol y los mapea', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse([
        { id: 'm1', user_id: 'auth0|abc', nickname: 'Mateo', joined_at: '2026-09-20T12:00:00Z' },
        { id: 'm2', user_id: 'auth0|def', nickname: null, joined_at: '2026-09-21T12:00:00Z' },
      ])
    );
    globalThis.fetch = fetchMock;

    const members = await getRoleMembers('srv-1', 'role-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1/roles/role-1/members');
    expect(init.method).toBe('GET');
    expect(members).toEqual([
      { id: 'm1', userId: 'auth0|abc', nickname: 'Mateo', joinedAt: '2026-09-20T12:00:00Z' },
      { id: 'm2', userId: 'auth0|def', nickname: null, joinedAt: '2026-09-21T12:00:00Z' },
    ]);
  });

  it('getRoleMembers devuelve una lista vacía si el rol no tiene miembros', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse([]));

    await expect(getRoleMembers('srv-1', 'role-1')).resolves.toEqual([]);
  });

  it('getRoleMembers propaga un ApiError si no hay permisos (403)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: 'You do not have permissions to manage roles in this server.' }, 403));

    await expect(getRoleMembers('srv-1', 'role-1')).rejects.toBeInstanceOf(ApiError);
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

  it('updateRolePermissions hace PATCH con el bitmask y devuelve el rol mapeado', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(backendRole({ permissions_bitmask: (1 << 9) | (1 << 2) })));
    globalThis.fetch = fetchMock;

    const role = await updateRolePermissions('srv-1', 'role-1', ['SEND_MESSAGES', 'MANAGE_ROLES']);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1/roles/role-1/permissions');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ new_permissions_bitmask: (1 << 9) | (1 << 2) });
    expect(role.permissions.sort()).toEqual(['MANAGE_ROLES', 'SEND_MESSAGES']);
  });

  it('updateRolePermissions propaga un ApiError si se quita ADMINISTRATOR del propio rol (403)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: 'You cannot remove the ADMINISTRATOR permission from your own role' }, 403));

    await expect(updateRolePermissions('srv-1', 'role-1', [])).rejects.toBeInstanceOf(ApiError);
  });

  it('updateRoleInfo hace PATCH con nombre recortado y color, y devuelve el rol mapeado', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(backendRole({ name: 'Admins', color: '#da373c' })));
    globalThis.fetch = fetchMock;

    const role = await updateRoleInfo('srv-1', 'role-1', { name: '  Admins  ', color: '#da373c' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1/roles/role-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ name: 'Admins', color: '#da373c' });
    expect(role.name).toBe('Admins');
    expect(role.color).toBe('#da373c');
  });

  it('updateRoleInfo envía solo los campos que cambian', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(backendRole())));
    globalThis.fetch = fetchMock;

    await updateRoleInfo('srv-1', 'role-1', { color: '#eb459e' });
    await updateRoleInfo('srv-1', 'role-1', { name: 'Solo nombre' });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ color: '#eb459e' });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ name: 'Solo nombre' });
  });

  it('updateRoleInfo propaga un ApiError si se renombra el rol por defecto (400)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ detail: 'Cannot change the name of the default server role.' }, 400));

    await expect(updateRoleInfo('srv-1', 'role-0', { name: 'Otro' })).rejects.toBeInstanceOf(ApiError);
  });

  it('setDefaultRole hace PATCH sin body y devuelve el rol como por defecto', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(backendRole({ is_default: true })));
    globalThis.fetch = fetchMock;

    const role = await setDefaultRole('srv-1', 'role-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1/roles/role-1/default');
    expect(init.method).toBe('PATCH');
    expect(init.body).toBeUndefined();
    expect(role.isDefault).toBe(true);
  });

  it('setDefaultRole propaga un ApiError si el rol no existe (404)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ detail: 'Role not found.' }, 404));

    await expect(setDefaultRole('srv-1', 'nope')).rejects.toBeInstanceOf(ApiError);
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
