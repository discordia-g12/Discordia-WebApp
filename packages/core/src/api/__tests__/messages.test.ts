import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { getMessages, sendMessage } from '../messages';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('mensajes', () => {
  beforeEach(() => configureClient({ baseUrl: 'http://api.test' }));
  afterEach(() => vi.restoreAllMocks());

  it('completa timestamp con createdAt (Chat-Engine manda solo createdAt)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ messages: [{ id: 'm1', content: 'hola', authorId: 'u1', channelId: 'c1', createdAt: '2026-10-20T10:00:00Z' }] })
    );
    const [message] = await getMessages('c1');
    expect(message.timestamp).toBe('2026-10-20T10:00:00Z');
    expect(message.createdAt).toBe('2026-10-20T10:00:00Z');
  });

  it('respeta timestamp si viene y acepta la lista sin envoltorio', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse([{ id: 'm1', content: 'hola', authorId: 'u1', channelId: 'c1', timestamp: '2026-10-21T10:00:00Z' }])
    );
    const [message] = await getMessages('c1');
    expect(message.timestamp).toBe('2026-10-21T10:00:00Z');
    expect(message.createdAt).toBe('2026-10-21T10:00:00Z');
  });

  it('el envío por REST también vuelve con timestamp', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ id: 'm2', content: 'chau', authorId: 'u1', channelId: 'c1', createdAt: '2026-10-22T10:00:00Z' }, 201)
    );
    const sent = await sendMessage('c1', 'chau', 'key-1');
    expect(sent.timestamp).toBe('2026-10-22T10:00:00Z');
  });
});
