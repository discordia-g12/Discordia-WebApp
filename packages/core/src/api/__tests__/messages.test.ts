import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import {
  deleteMessage,
  editMessage,
  getMessages,
  getPinnedMessages,
  normalizeMessage,
  sendMessage,
  setMessagePinned,
  toggleReaction,
} from '../messages';
import type { Message } from '../../types';

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

  it('deleteMessage llama a DELETE y devuelve el mensaje normalizado como deleted', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        id: 'm1',
        content: '',
        authorId: 'u1',
        channelId: 'c1',
        createdAt: '2026-10-20T10:00:00Z',
        type: 'deleted',
        isDeleted: true,
      })
    );

    const deleted = await deleteMessage('c1', 'm1');
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://api.test/api/v1/chat/channels/c1/messages/m1',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
    expect(deleted.id).toBe('m1');
    expect(deleted.type).toBe('deleted');
    expect(deleted.content).toBe('');
  });

  it('normaliza mensajes con isDeleted asignando type deleted y limpiando contenido', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse([
        {
          id: 'm-del',
          content: 'este texto debe borrarse',
          authorId: 'u1',
          channelId: 'c1',
          createdAt: '2026-10-20T10:00:00Z',
          isDeleted: true,
          attachments: [{ id: 'att-1', name: 'img.png', url: '/att.png' }],
        },
      ])
    );
    const [msg] = await getMessages('c1');
    expect(msg.type).toBe('deleted');
    expect(msg.content).toBe('');
    expect(msg.attachments).toBeUndefined();
  });

  it('toggleReaction llama a PUT con el emoji y devuelve el mensaje normalizado con reacciones', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        id: 'm1',
        content: 'mensaje',
        authorId: 'u1',
        channelId: 'c1',
        createdAt: '2026-10-20T10:00:00Z',
        reactions: [{ emoji: '👍', count: 1, users: ['u1'] }],
      })
    );

    const updated = await toggleReaction('c1', 'm1', '👍');
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://api.test/api/v1/chat/channels/c1/messages/m1/reactions',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ emoji: '👍' }),
      })
    );
    expect(updated.id).toBe('m1');
    expect(updated.reactions).toEqual([{ emoji: '👍', count: 1, users: ['u1'] }]);
  });

  it('normaliza mensajes eliminados limpiando también sus reacciones', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse([
        {
          id: 'm-del-react',
          content: 'este texto debe borrarse',
          authorId: 'u1',
          channelId: 'c1',
          createdAt: '2026-10-20T10:00:00Z',
          isDeleted: true,
          reactions: [{ emoji: '🔥', count: 2, users: ['u1', 'u2'] }],
        },
      ])
    );
    const [msg] = await getMessages('c1');
    expect(msg.type).toBe('deleted');
    expect(msg.reactions).toEqual([]);
  });

  describe('fijados', () => {
    const base = { id: 'm1', content: 'hola', authorId: 'u1', channelId: 'c1', createdAt: '2026-10-20T10:00:00Z' };

    it('normaliza pinned de Chat-Engine a isPinned, y un borrado nunca queda fijado', () => {
      const pinned = normalizeMessage({ ...base, pinned: true, pinnedAt: '2026-10-21T10:00:00Z', pinnedBy: 'u2' } as unknown as Message);
      expect(pinned).toMatchObject({ isPinned: true, pinnedAt: '2026-10-21T10:00:00Z', pinnedBy: 'u2' });

      const unpinned = normalizeMessage({ ...base, pinned: false } as unknown as Message);
      expect(unpinned).toMatchObject({ isPinned: false, pinnedAt: null, pinnedBy: null });

      const deleted = normalizeMessage({ ...base, pinned: true, isDeleted: true } as unknown as Message);
      expect(deleted.isPinned).toBe(false);
    });

    it('fija con PUT y desfija con DELETE sobre /pin', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async () => jsonResponse({ ...base, pinned: true, pinnedAt: '2026-10-21T10:00:00Z' }));

      const pinned = await setMessagePinned('c1', 'm1', true);
      expect(pinned.isPinned).toBe(true);
      expect(String(fetchSpy.mock.calls[0][0])).toBe('http://api.test/api/v1/chat/channels/c1/messages/m1/pin');
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('PUT');

      fetchSpy.mockImplementation(async () => jsonResponse({ ...base, pinned: false }));
      const unpinned = await setMessagePinned('c1', 'm1', false);
      expect(unpinned.isPinned).toBe(false);
      expect(fetchSpy.mock.calls[1][1]?.method).toBe('DELETE');
    });

    it('lista los fijados del canal', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([{ ...base, pinned: true }]));
      const list = await getPinnedMessages('dm-1');
      expect(String(fetchSpy.mock.calls[0][0])).toBe('http://api.test/api/v1/chat/channels/dm-1/pins');
      expect(list.map((m) => m.isPinned)).toEqual([true]);
    });
  });
});
