import { describe, it, expect } from 'vitest';
import type { Conversation, FriendRequest, PublicProfile } from '../../types';
import { buildDmList, isConversationRequester, isMessageRequest, isWaitingForReply } from '../inboxList';

const conversation = (
  id: string,
  status: Conversation['status'],
  requestedBy: string,
  createdAt?: string
): Conversation => ({
  id,
  status,
  requestedBy,
  otherUserId: 'other',
  unreadCount: 0,
  ...(createdAt ? { lastMessage: { content: 'hola', authorId: requestedBy, createdAt } } : {}),
});

const friendRequest = (id: string, createdAt: string): FriendRequest => ({
  id,
  user: { id: `user-${id}` } as PublicProfile,
  message: null,
  createdAt,
});

describe('estado de una conversación', () => {
  it('sabe quién la inició sin conocer el id propio', () => {
    expect(isConversationRequester(conversation('dm-1', 'pending', 'me'))).toBe(true);
    expect(isConversationRequester(conversation('dm-1', 'pending', 'other'))).toBe(false);
  });

  it('quien inició sigue esperando respuesta aunque se la hayan rechazado', () => {
    expect(isWaitingForReply(conversation('dm-1', 'pending', 'me'))).toBe(true);
    expect(isWaitingForReply(conversation('dm-1', 'declined', 'me'))).toBe(true);
    expect(isWaitingForReply(conversation('dm-1', 'accepted', 'me'))).toBe(false);
    expect(isWaitingForReply(conversation('dm-1', 'pending', 'other'))).toBe(false);
  });

  it('una solicitud de mensaje es pendiente y recibida', () => {
    expect(isMessageRequest(conversation('dm-1', 'pending', 'other'))).toBe(true);
    expect(isMessageRequest(conversation('dm-1', 'pending', 'me'))).toBe(false);
    expect(isMessageRequest(conversation('dm-1', 'declined', 'other'))).toBe(false);
  });
});

describe('buildDmList', () => {
  it('mezcla conversaciones y solicitudes, de lo más reciente a lo más viejo', () => {
    const list = buildDmList(
      [
        conversation('dm-old', 'accepted', 'other', '2026-01-01T00:00:00.000Z'),
        conversation('dm-new', 'pending', 'other', '2026-03-01T00:00:00.000Z'),
      ],
      [friendRequest('fr', '2026-02-01T00:00:00.000Z')]
    );

    expect(list.map((item) => item.key)).toEqual(['dm-new', 'friend-request-fr', 'dm-old']);
  });

  it('clasifica cada fila', () => {
    const list = buildDmList(
      [
        conversation('dm-a', 'accepted', 'me', '2026-04-01T00:00:00.000Z'),
        conversation('dm-b', 'pending', 'me', '2026-03-01T00:00:00.000Z'),
        conversation('dm-c', 'declined', 'me', '2026-02-01T00:00:00.000Z'),
        conversation('dm-d', 'pending', 'other', '2026-01-01T00:00:00.000Z'),
      ],
      []
    );

    expect(list.map((item) => item.kind)).toEqual(['conversation', 'waiting_reply', 'waiting_reply', 'message_request']);
  });

  it('saca la conversación que rechazó el usuario', () => {
    expect(buildDmList([conversation('dm-1', 'declined', 'other')], [])).toEqual([]);
  });

  it('da la persona de cada fila', () => {
    const list = buildDmList([conversation('dm-1', 'accepted', 'other')], [friendRequest('fr', '2026-02-01T00:00:00.000Z')]);

    expect(list.map((item) => item.userId)).toEqual(['user-fr', 'other']);
  });

  it('deja al final lo que no tiene fecha y no depende del orden de entrada', () => {
    const a = conversation('dm-a', 'accepted', 'other');
    const b = conversation('dm-b', 'accepted', 'other');
    const dated = conversation('dm-c', 'accepted', 'other', '2026-01-01T00:00:00.000Z');

    const keys = ['dm-c', 'dm-a', 'dm-b'];
    expect(buildDmList([a, b, dated], []).map((i) => i.key)).toEqual(keys);
    expect(buildDmList([b, dated, a], []).map((i) => i.key)).toEqual(keys);
  });

  it('tolera que las listas todavía no hayan cargado', () => {
    expect(buildDmList(undefined, undefined)).toEqual([]);
  });
});
