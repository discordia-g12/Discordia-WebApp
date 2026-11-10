import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { deleteServer, editChannel, isLocalCategoryId, mapServerFromBackend } from '../servers';
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
