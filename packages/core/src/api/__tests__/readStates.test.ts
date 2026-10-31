import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { getUnread, markAllRead, markChannelRead } from '../readStates';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('no leídos', () => {
  beforeEach(() => configureClient({ baseUrl: 'http://api.test' }));
  afterEach(() => vi.restoreAllMocks());

  it('pide los no leídos a Chat-Engine', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ channels: [{ channelId: 'c1', unreadCount: 3, mentionCount: 0 }] }));

    expect(await getUnread()).toEqual([{ channelId: 'c1', unreadCount: 3, mentionCount: 0 }]);
    expect(String(fetchSpy.mock.calls[0][0])).toBe('http://api.test/api/v1/chat/unread');
  });

  it('marca un canal hasta un mensaje, o hasta el último sin cuerpo', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(null, { status: 204 }));

    await markChannelRead('c1', 'm9');
    await markChannelRead('c1');

    const [withId, withoutId] = fetchSpy.mock.calls;
    expect(String(withId[0])).toBe('http://api.test/api/v1/chat/channels/c1/read');
    expect(withId[1]?.method).toBe('POST');
    expect(withId[1]?.body).toBe(JSON.stringify({ messageId: 'm9' }));
    // Sin cuerpo no va content-type: Fastify rechaza un JSON vacío
    expect(withoutId[1]?.body).toBeUndefined();
  });

  it('marca todo como leído', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await markAllRead();

    expect(String(fetchSpy.mock.calls[0][0])).toBe('http://api.test/api/v1/chat/read-states/read-all');
    expect(fetchSpy.mock.calls[0][1]?.method).toBe('POST');
  });
});
