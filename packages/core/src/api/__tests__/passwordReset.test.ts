import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { ApiError, PROBLEM_TYPES } from '../errors';
import { requestPasswordReset } from '../passwordReset';

describe('requestPasswordReset (endpoint público)', () => {
  let getToken: ReturnType<typeof vi.fn>;
  let onAuthFailure: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    getToken = vi.fn().mockRejectedValue(new Error('login_required'));
    onAuthFailure = vi.fn();
    configureClient({ baseUrl: 'http://localhost:8000', getToken, onAuthFailure, timeoutMs: 500 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no pide token ni dispara onAuthFailure aunque no haya sesión', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'ok' }), { status: 202, headers: { 'content-type': 'application/json' } }),
    );

    await requestPasswordReset('  ana@discordia.com ');

    expect(getToken).not.toHaveBeenCalled();
    expect(onAuthFailure).not.toHaveBeenCalled();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8000/api/v1/auth/password-reset');
    expect(JSON.parse(String(init.body))).toEqual({ email: 'ana@discordia.com' });
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('un 429 llega como ApiError con type y retryAfterSeconds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ type: PROBLEM_TYPES.PASSWORD_RESET_THROTTLED, title: 'Too Many Requests', status: 429 }),
        { status: 429, headers: { 'content-type': 'application/problem+json', 'retry-after': '120' } },
      ),
    );

    const err = await requestPasswordReset('ana@discordia.com').catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(429);
    expect(err.type).toBe(PROBLEM_TYPES.PASSWORD_RESET_THROTTLED);
    expect(err.retryAfterSeconds).toBe(120);
  });

  it('un 401 en un endpoint público no intenta refrescar el token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ title: 'Unauthorized', status: 401 }), {
        status: 401,
        headers: { 'content-type': 'application/problem+json' },
      }),
    );

    const err = await requestPasswordReset('ana@discordia.com').catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(getToken).not.toHaveBeenCalled();
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('ignora un Retry-After que no es un número de segundos', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ title: 'Too Many Requests', status: 429 }), {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' },
      }),
    );

    const err = await requestPasswordReset('ana@discordia.com').catch((e) => e);

    expect(err.retryAfterSeconds).toBeUndefined();
  });
});
