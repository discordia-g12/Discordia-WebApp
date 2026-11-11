import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { ApiError } from '../errors';
import {
  deleteServer,
  editChannel,
  isLocalCategoryId,
  mapServerFromBackend,
  removeServerBanner,
  serverBannerErrorMessage,
  serverSettingsErrorMessage,
  serverSettingsValidationError,
  updateServer,
  updateServerBanner,
} from '../servers';
import type { ChannelBackendResponse, ServerBackendResponse } from '../../types';

function backendChannel(overrides: Partial<ChannelBackendResponse> = {}): ChannelBackendResponse {
  return {
    id: 'ch-1',
    name: 'general',
    type: 'text',
    server_id: 'srv-1',
    category_id: null,
    position: 0,
    ...overrides,
  };
}

function backendServer(overrides: Partial<ServerBackendResponse> = {}): ServerBackendResponse {
  return {
    id: 'srv-1',
    name: 'Servidor',
    owner_id: 'owner',
    created_at: '2026-01-01T00:00:00Z',
    channels: [],
    categories: [],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('mapServerFromBackend', () => {
  it('trae la descripción y el banner (la franja del servidor lo usa en lugar del ícono)', () => {
    const server = mapServerFromBackend(
      backendServer({ description: 'Hola', icon_url: 'https://x/i.webp', banner_url: 'https://x/b.webp' })
    );
    expect(server).toMatchObject({ description: 'Hola', iconUrl: 'https://x/i.webp', banner: 'https://x/b.webp' });

    const without = mapServerFromBackend(backendServer({ description: null, banner_url: null }));
    expect(without.banner).toBeUndefined();
    expect(without.description).toBeUndefined();
  });

  it('convierte my_permissions en ids de permisos (o lo deja vacío si el backend no lo manda)', () => {
    const withPermissions = mapServerFromBackend(backendServer({ my_permissions: (1 << 1) | (1 << 6) }));
    expect(withPermissions.myPermissions).toEqual(['MANAGE_CHANNELS', 'CREATE_INSTANT_INVITE']);

    expect(mapServerFromBackend(backendServer()).myPermissions).toBeUndefined();
  });

  it('agrupa cada canal bajo su categoría (CA 2)', () => {
    const server = mapServerFromBackend(
      backendServer({
        channels: [backendChannel({ id: 'ch-a', category_id: 'uuid-1' })],
        categories: [{ id: 'uuid-1', server_id: 'srv-1', name: 'GAMING', position: 0 }],
      })
    );

    const gaming = server.categories.find((c) => c.name === 'GAMING');
    expect(gaming?.channels.map((ch) => ch.id)).toEqual(['ch-a']);
  });

  it('muestra los canales sin categoría en la sección general (CA 3)', () => {
    const server = mapServerFromBackend(
      backendServer({
        channels: [
          backendChannel({ id: 'ch-free' }),
          backendChannel({ id: 'ch-grouped', category_id: 'uuid-1' }),
        ],
        categories: [{ id: 'uuid-1', server_id: 'srv-1', name: 'GAMING', position: 0 }],
      })
    );

    const general = server.categories[0];
    expect(isLocalCategoryId(general.id)).toBe(true);
    expect(general.channels.map((ch) => ch.id)).toEqual(['ch-free']);
  });

  it('omite la sección general si todos los canales tienen categoría', () => {
    const server = mapServerFromBackend(
      backendServer({
        channels: [backendChannel({ category_id: 'uuid-1' })],
        categories: [{ id: 'uuid-1', server_id: 'srv-1', name: 'GAMING', position: 0 }],
      })
    );

    expect(server.categories.map((c) => c.name)).toEqual(['GAMING']);
  });

  it('marca el servidor suspendido por el staff y no arma la sección general vacía', () => {
    // Server-Roles ya manda un suspendido sin canales ni categorías (member_server_view)
    const suspended = mapServerFromBackend(backendServer({ is_suspended: true }));
    expect(suspended.isSuspended).toBe(true);
    expect(suspended.categories).toEqual([]);

    expect(mapServerFromBackend(backendServer()).isSuspended).toBe(false);
  });
});

describe('editChannel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    configureClient({
      baseUrl: 'http://localhost:8000',
      getToken: vi.fn().mockResolvedValue('jwt-token'),
      onAuthFailure: vi.fn(),
      timeoutMs: 500,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('manda category_id null al mover el canal a la sección general', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(backendChannel()));
    globalThis.fetch = fetchMock;

    await editChannel('srv-1', 'ch-1', { categoryId: 'cat-srv-1-general' });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ category_id: null });
  });

  it('manda el id de la categoría real al mover el canal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(backendChannel({ category_id: 'uuid-1' })));
    globalThis.fetch = fetchMock;

    const channel = await editChannel('srv-1', 'ch-1', { categoryId: 'uuid-1' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1/channels/ch-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ category_id: 'uuid-1' });
    expect(channel.categoryId).toBe('uuid-1');
  });
});

describe('deleteServer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    configureClient({
      baseUrl: 'http://localhost:8000',
      getToken: vi.fn().mockResolvedValue('jwt-token'),
      onAuthFailure: vi.fn(),
      timeoutMs: 500,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('llama a DELETE /api/v1/servers/:serverId', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock;

    await deleteServer('srv-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1');
    expect(init.method).toBe('DELETE');
  });
});

describe('configuración del servidor', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    configureClient({
      baseUrl: 'http://localhost:8000',
      getToken: vi.fn().mockResolvedValue('jwt-token'),
      onAuthFailure: vi.fn(),
      timeoutMs: 500,
    });
    fetchMock = vi.fn(async () => jsonResponse(backendServer({ name: 'Nuevo', banner_url: 'https://x/b.webp' })));
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updateServer manda PATCH /servers/:id con los campos que vienen, con trim', async () => {
    const server = await updateServer('srv-1', { name: '  Nuevo  ' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/servers/srv-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ name: 'Nuevo' });
    expect(server.name).toBe('Nuevo');
  });

  it('updateServerBanner sube el archivo en el campo "banner"; removeServerBanner lo borra', async () => {
    const file = new File([new Uint8Array([1])], 'b.png', { type: 'image/png' });

    const updated = await updateServerBanner('srv-1', file);
    await removeServerBanner('srv-1');

    const [putUrl, put] = fetchMock.mock.calls[0];
    expect(putUrl).toBe('http://localhost:8000/api/v1/servers/srv-1/banner');
    expect(put.method).toBe('PUT');
    expect(((put.body as FormData).get('banner') as File).name).toBe('b.png');
    expect(updated.banner).toBe('https://x/b.webp');
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
  });

  it.each([
    [{ name: '' }, 'El nombre no puede quedar vacío.'],
    [{ name: '   ' }, 'El nombre no puede quedar vacío.'],
    [{ name: 'a'.repeat(101) }, 'El nombre puede tener hasta 100 caracteres.'],
    [{ name: 'a\u0000b' }, 'El nombre tiene caracteres no permitidos.'],
    [{ description: 'd'.repeat(1001) }, 'La descripción puede tener hasta 1000 caracteres.'],
    [{ description: 'a\u0000b' }, 'La descripción tiene caracteres no permitidos.'],
  ])('serverSettingsValidationError rechaza %j', (payload, message) => {
    expect(serverSettingsValidationError(payload)).toBe(message);
  });

  it('serverSettingsValidationError acepta datos válidos (100 caracteres, descripción vacía)', () => {
    expect(serverSettingsValidationError({ name: 'a'.repeat(100), description: '' })).toBeNull();
    expect(serverSettingsValidationError({})).toBeNull();
  });

  it('serverSettingsErrorMessage explica cada error del backend en castellano', () => {
    expect(serverSettingsErrorMessage(new ApiError({ status: 403 }))).toBe(
      'Necesitás el permiso Gestionar servidor para cambiar la configuración.'
    );
    expect(serverSettingsErrorMessage(new ApiError({ status: 404 }))).toBe('El servidor ya no existe.');
    expect(serverSettingsErrorMessage(new ApiError({ status: 422, invalidParams: [{ name: 'name', msg: 'x' }] }))).toBe(
      'El nombre tiene que tener entre 1 y 100 caracteres.'
    );
    expect(
      serverSettingsErrorMessage(new ApiError({ status: 422, invalidParams: [{ loc: ['body', 'description'], msg: 'x' }] }))
    ).toBe('La descripción puede tener hasta 1000 caracteres.');
    expect(serverSettingsErrorMessage(new Error('red'))).toBe('No se pudo guardar la configuración. Probá de nuevo.');
  });

  it('serverBannerErrorMessage: sin permiso lo dice; si no, el error de imagen', () => {
    expect(serverBannerErrorMessage(new ApiError({ status: 403 }))).toBe('Necesitás el permiso Gestionar servidor para cambiar el banner.');
    expect(serverBannerErrorMessage(new ApiError({ status: 413 }))).toBe('La imagen pesa más de 5 MB.');
  });
});
