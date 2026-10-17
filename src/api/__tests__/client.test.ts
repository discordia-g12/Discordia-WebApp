import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient, request, api } from '../client';
import { ApiError, NetworkError, TimeoutError } from '../errors';

describe('HttpClient & Interceptors', () => {
  let mockGetToken: ReturnType<typeof vi.fn>;
  let mockOnAuthFailure: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockGetToken = vi.fn<any>().mockResolvedValue('initial-jwt-token');
    mockOnAuthFailure = vi.fn<any>();

    configureClient({
      baseUrl: 'http://localhost:8000',
      getToken: mockGetToken,
      onAuthFailure: mockOnAuthFailure,
      timeoutMs: 500,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no accede a localStorage ni sessionStorage durante las peticiones', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await api.get('/test');

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(getItemSpy).not.toHaveBeenCalled();
  });

  it('inyecta Authorization: Bearer, X-Correlation-ID y no envía cookies de API', async () => {
    let capturedRequest: { url: string; init?: RequestInit } | null = null;
    globalThis.fetch = vi.fn().mockImplementation((url, init) => {
      capturedRequest = { url, init };
      return Promise.resolve(
        new Response(JSON.stringify({ data: 123 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    });

    await api.get('/api/v1/users/me');

    expect(capturedRequest).not.toBeNull();
    const headers = capturedRequest!.init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer initial-jwt-token');
    expect(headers['X-Correlation-ID']).toBeDefined();
    expect(capturedRequest!.init?.credentials).toBe('same-origin');
  });

  it('deduplica renovaciones de token concurrentes ante múltiples respuestas 401', async () => {
    mockGetToken.mockImplementation(async (opts?: { forceRefresh?: boolean }) => {
      if (opts?.forceRefresh) {
        return 'refreshed-jwt-token';
      }
      return 'initial-jwt-token';
    });

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      const headers = init?.headers as Record<string, string>;
      if (headers['Authorization'] === 'Bearer initial-jwt-token') {
        return Promise.resolve(
          new Response(
            JSON.stringify({ title: 'Unauthorized', detail: 'Token expired' }),
            {
              status: 401,
              headers: { 'content-type': 'application/problem+json' },
            }
          )
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    });

    // Disparar 3 peticiones concurrentes
    const [res1, res2, res3] = await Promise.all([
      api.get('/api/v1/test1'),
      api.get('/api/v1/test2'),
      api.get('/api/v1/test3'),
    ]);

    expect(res1).toEqual({ success: true });
    expect(res2).toEqual({ success: true });
    expect(res3).toEqual({ success: true });

    // La renovación forceRefresh debió llamarse exactamente UNA vez
    const forceRefreshCalls = mockGetToken.mock.calls.filter((call) => call[0]?.forceRefresh);
    expect(forceRefreshCalls.length).toBe(1);
    expect(mockOnAuthFailure).not.toHaveBeenCalled();
  });

  it('reintenta una sola vez ante 401 y si vuelve a fallar invoca onAuthFailure sin loop', async () => {
    mockGetToken.mockResolvedValue('some-token');

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ title: 'Unauthorized', detail: 'Invalid token' }),
        {
          status: 401,
          headers: { 'content-type': 'application/problem+json' },
        }
      )
    );

    await expect(api.get('/api/v1/test')).rejects.toThrow(ApiError);
    expect(mockOnAuthFailure).toHaveBeenCalledTimes(1);
    // 1 intento original + 1 reintento = 2 llamadas a fetch
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('no reintenta ni renueva token ante 403 Forbidden', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ title: 'Forbidden', detail: 'Insufficient permissions' }),
        {
          status: 403,
          headers: { 'content-type': 'application/problem+json' },
        }
      )
    );

    await expect(api.get('/api/v1/audit')).rejects.toThrow(ApiError);
    const forceRefreshCalls = mockGetToken.mock.calls.filter((call) => call[0]?.forceRefresh);
    expect(forceRefreshCalls.length).toBe(0);
    expect(mockOnAuthFailure).not.toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('preserva el Idempotency-Key en los reintentos', async () => {
    mockGetToken.mockImplementation(async (opts) =>
      opts?.forceRefresh ? 'new-token' : 'old-token'
    );

    const capturedKeys: string[] = [];
    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      const headers = init?.headers as Record<string, string>;
      capturedKeys.push(headers['Idempotency-Key']);
      if (headers['Authorization'] === 'Bearer old-token') {
        return Promise.resolve(new Response('', { status: 401 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify({ sent: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    });

    await request('POST', '/api/v1/messages', {
      body: { text: 'hola' },
      idempotencyKey: 'custom-idempotency-123',
    });

    expect(capturedKeys).toEqual(['custom-idempotency-123', 'custom-idempotency-123']);
  });

  it('lanza TimeoutError cuando se supera el tiempo límite', async () => {
    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    await expect(request('GET', '/api/v1/slow', { timeoutMs: 50 })).rejects.toThrow(TimeoutError);
  });

  it('lanza NetworkError cuando fetch es rechazado', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api.get('/api/v1/offline')).rejects.toThrow(NetworkError);
  });

  it('normaliza errores en formato RFC 7807, {detail: string} y 422 de FastAPI', async () => {
    // 1. RFC 7807 (Kong)
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: 'https://httpstatuses.com/400',
          title: 'Bad Request',
          detail: 'Missing header',
        }),
        { status: 400, headers: { 'content-type': 'application/problem+json' } }
      )
    );
    await expect(api.get('/test')).rejects.toMatchObject({
      status: 400,
      title: 'Bad Request',
      detail: 'Missing header',
    });

    // 2. FastAPI { detail: string }
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'User not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    );
    await expect(api.get('/test')).rejects.toMatchObject({
      status: 404,
      detail: 'User not found',
    });

    // 3. FastAPI 422 { detail: [{ loc, msg }] }
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          detail: [{ loc: ['body', 'username'], msg: 'field required', type: 'missing' }],
        }),
        { status: 422, headers: { 'content-type': 'application/json' } }
      )
    );
    try {
      await api.post('/test', {});
      expect.unreachable();
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(422);
      expect(err.invalidParams).toEqual([{ name: 'username', loc: ['body', 'username'], msg: 'field required' }]);
    }
  });
});
