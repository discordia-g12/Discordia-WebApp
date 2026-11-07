import { describe, it, expect } from 'vitest';
import type { Conversation, Message } from '../../types';
import { applyConversationMessage, removeConversation, upsertConversation } from '../inboxCache';

const conversation = (id: string, createdAt: string, unreadCount = 0): Conversation => ({
  id,
  status: 'accepted',
  requestedBy: 'other',
  otherUserId: 'other',
  unreadCount,
  lastMessage: { content: 'vieja', authorId: 'other', createdAt },
});

const message = (authorId: string, createdAt = '2026-05-01T00:00:00.000Z') =>
  ({ id: 'm1', content: 'nuevo', authorId, channelId: 'dm-b', createdAt, timestamp: createdAt }) as Message;

const list = () => [conversation('dm-a', '2026-02-01T00:00:00.000Z'), conversation('dm-b', '2026-01-01T00:00:00.000Z', 2)];

describe('upsertConversation', () => {
  it('agrega una nueva en su lugar', () => {
    const result = upsertConversation(list(), conversation('dm-c', '2026-03-01T00:00:00.000Z'));

    expect(result?.map((c) => c.id)).toEqual(['dm-c', 'dm-a', 'dm-b']);
  });

  it('reemplaza la que ya estaba', () => {
    const result = upsertConversation(list(), { ...conversation('dm-a', '2026-02-01T00:00:00.000Z'), status: 'pending' });

    expect(result).toHaveLength(2);
    expect(result?.[0].status).toBe('pending');
  });

  it('no inventa la lista si todavía no cargó', () => {
    expect(upsertConversation(undefined, conversation('dm-a', '2026-02-01T00:00:00.000Z'))).toBeUndefined();
  });
});

describe('removeConversation', () => {
  it('la saca de la lista', () => {
    expect(removeConversation(list(), 'dm-a')?.map((c) => c.id)).toEqual(['dm-b']);
  });
});

describe('applyConversationMessage', () => {
  it('actualiza la vista previa, la sube y suma un no leído', () => {
    const [first] = applyConversationMessage(list(), 'dm-b', message('other')) as Conversation[];

    expect(first.id).toBe('dm-b');
    expect(first.unreadCount).toBe(3);
    expect(first.lastMessage).toEqual({ content: 'nuevo', authorId: 'other', createdAt: '2026-05-01T00:00:00.000Z' });
  });

  it('no suma no leídos por un mensaje propio', () => {
    const [first] = applyConversationMessage(list(), 'dm-b', message('me')) as Conversation[];

    expect(first.unreadCount).toBe(2);
  });

  it('no suma no leídos en la conversación abierta', () => {
    const [first] = applyConversationMessage(list(), 'dm-b', message('other'), 'dm-b') as Conversation[];

    expect(first.unreadCount).toBe(2);
  });
});
