import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { getNotificationPreferences } from '../notifications';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('preferencias de avisos', () => {
  beforeEach(() => configureClient({ baseUrl: 'http://api.test' }));
  afterEach(() => vi.restoreAllMocks());

  it('una respuesta fuera de contrato (204, null, sin items) se lee como vacía', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await getNotificationPreferences()).toEqual([]);
    fetch.mockResolvedValueOnce(jsonResponse(null));
    expect(await getNotificationPreferences()).toEqual([]);
    fetch.mockResolvedValueOnce(jsonResponse({}));
    expect(await getNotificationPreferences()).toEqual([]);
  });
});
