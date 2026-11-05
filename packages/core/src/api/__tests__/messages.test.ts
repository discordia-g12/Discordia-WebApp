import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { editMessage, getMessages, sendMessage } from '../messages';

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

  it('normaliza las URLs relativas de los adjuntos en los mensajes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        messages: [
          {
            id: 'm3',
            content: '',
            authorId: 'u1',
            channelId: 'c1',
            createdAt: '2026-10-22T10:00:00Z',
            attachments: [
              {
                id: 'att-1',
                name: 'screenshot.png',
                url: '/api/v1/chat/uploads/attachments/c1/att-1-screenshot.png',
                size: 1024,
                contentType: 'image/png',
              },
            ],
          },
        ],
      })
    );
    const [msg] = await getMessages('c1');
    expect(msg.attachments?.[0].url).toBe(
      'http://api.test/api/v1/chat/uploads/attachments/c1/att-1-screenshot.png'
    );
  });

  it('editMessage llama a PATCH con el nuevo contenido y devuelve el mensaje normalizado', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        id: 'm1',
        content: 'contenido editado',
        authorId: 'u1',
        channelId: 'c1',
        createdAt: '2026-10-20T10:00:00Z',
        edited: true,
        editedAt: '2026-10-20T10:05:00Z',
      })
    );

    const updated = await editMessage('c1', 'm1', 'contenido editado');
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://api.test/api/v1/chat/channels/c1/messages/m1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ content: 'contenido editado' }),
      })
    );
    expect(updated.id).toBe('m1');
    expect(updated.content).toBe('contenido editado');
    expect(updated.edited).toBe(true);
    expect(updated.editedTimestamp).toBe('2026-10-20T10:05:00Z');
  });

  it('normaliza mensajes con editedAt asignando edited: true y editedTimestamp', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse([
        {
          id: 'm1',
          content: 'editado',
          authorId: 'u1',
          channelId: 'c1',
          createdAt: '2026-10-20T10:00:00Z',
          edited: true,
          editedAt: '2026-10-20T10:05:00Z',
        },
      ])
    );
    const [msg] = await getMessages('c1');
    expect(msg.edited).toBe(true);
    expect(msg.editedTimestamp).toBe('2026-10-20T10:05:00Z');
  });
});
