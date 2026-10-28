import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { ApiError } from '../errors';
import {
  acceptServerTransfer,
  cancelServerTransfer,
  getPendingServerTransfer,
  initiateServerTransfer,
  mapServerOwnershipTransferFromBackend,
  rejectServerTransfer,
  transferErrorMessage,
} from '../serverTransfer';
import type { ServerOwnershipTransferBackendResponse } from '../../types';

function backendTransfer(overrides: Partial<ServerOwnershipTransferBackendResponse> = {}): ServerOwnershipTransferBackendResponse {
  return {
    id: 'tr-1',
    server_id: 'srv-1',
    sender_id: 'owner-1',
    target_user_id: 'member-1',
    status: 'PENDING',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('server transfer api', () => {
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

  it('mapea una transferencia del backend a modelo de dominio', () => {
    const raw = backendTransfer({ updated_at: '2026-01-02T00:00:00Z' });
    const mapped = mapServerOwnershipTransferFromBackend(raw);
    expect(mapped).toEqual({
      id: 'tr-1',
      serverId: 'srv-1',
      senderId: 'owner-1',
      targetUserId: 'member-1',
      status: 'PENDING',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    });
  });

  it('inicia una transferencia de servidor con POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(backendTransfer(), 201));
    vi.stubGlobal('fetch', fetchMock);

    const res = await initiateServerTransfer('srv-1', 'member-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/servers/srv-1/transfers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ target_user_id: 'member-1' }),
      })
    );
    expect(res.status).toBe('PENDING');
  });

  it('obtiene la transferencia pendiente o null', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(backendTransfer(), 200));
    vi.stubGlobal('fetch', fetchMock);

    const res = await getPendingServerTransfer('srv-1');
    expect(res?.id).toBe('tr-1');

    fetchMock.mockResolvedValueOnce(jsonResponse(null, 200));
    const emptyRes = await getPendingServerTransfer('srv-1');
    expect(emptyRes).toBeNull();
  });

  it('acepta una transferencia sin id y con id', async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(backendTransfer({ status: 'ACCEPTED' }), 200));
    vi.stubGlobal('fetch', fetchMock);

    const res1 = await acceptServerTransfer('srv-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/servers/srv-1/transfers/accept',
      expect.objectContaining({ method: 'POST' })
    );
    expect(res1.status).toBe('ACCEPTED');

    await acceptServerTransfer('srv-1', 'tr-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/servers/srv-1/transfers/tr-1/accept',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('rechaza una transferencia sin id y con id', async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(backendTransfer({ status: 'REJECTED' }), 200));
    vi.stubGlobal('fetch', fetchMock);

    const res1 = await rejectServerTransfer('srv-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/servers/srv-1/transfers/reject',
      expect.objectContaining({ method: 'POST' })
    );
    expect(res1.status).toBe('REJECTED');

    await rejectServerTransfer('srv-1', 'tr-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/servers/srv-1/transfers/tr-1/reject',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('cancela una transferencia por id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(backendTransfer({ status: 'CANCELLED' }), 200));
    vi.stubGlobal('fetch', fetchMock);

    const res = await cancelServerTransfer('srv-1', 'tr-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/servers/srv-1/transfers/tr-1/cancel',
      expect.objectContaining({ method: 'POST' })
    );
    expect(res.status).toBe('CANCELLED');
  });

  it('formatea mensajes de error según el status HTTP', () => {
    expect(transferErrorMessage(new ApiError({ status: 400, title: 'Bad request' }))).toContain('No se puede transferir');
    expect(transferErrorMessage(new ApiError({ status: 403, title: 'Forbidden' }))).toContain('Solo la dueña o el dueño');
    expect(transferErrorMessage(new ApiError({ status: 404, title: 'Not found' }))).toContain('no encontrada');
    expect(transferErrorMessage(new Error('crash'))).toContain('No se pudo completar');
  });
});
