import { describe, it, expect } from 'vitest';
import type { AppNotification } from '../../api/notifications';
import { notificationDestination, notificationLevelLabel, notificationPlace, notificationTitle } from '../display';

const base: AppNotification = {
  id: 'n1',
  reason: 'mention',
  serverId: 's1',
  channelId: 'c1',
  threadId: null,
  messageId: 'm1',
  actorId: 'u2',
  preview: 'hola',
  createdAt: '2026-11-01T00:00:00.000Z',
  readAt: null,
};

describe('texto del aviso', () => {
  it('título para cada motivo', () => {
    expect(notificationTitle('mention', 'Ana')).toBe('Ana te mencionó');
    expect(notificationTitle('dm', 'Ana')).toBe('Ana te escribió');
    expect(notificationTitle('thread_reply', 'Ana')).toBe('Ana respondió en un hilo');
    expect(notificationTitle('message', 'Ana', 'general')).toBe('Nuevo mensaje en #general');
    expect(notificationTitle('message', 'Ana')).toBe('Nuevo mensaje de Ana');
  });

  it('lugar: DM, canal o hilo', () => {
    expect(notificationPlace({ serverId: null, threadId: null }, 'ignorado')).toBe('Mensaje directo');
    expect(notificationPlace({ serverId: 's1', threadId: null }, 'general')).toBe('#general');
    expect(notificationPlace({ serverId: 's1', threadId: 'm0' }, 'general')).toBe('Hilo en #general');
    expect(notificationPlace({ serverId: 's1', threadId: null })).toBe('un canal');
  });

  it('etiqueta de nivel', () => {
    expect(notificationLevelLabel('mentions')).toBe('Solo menciones');
  });
});

describe('destino del aviso', () => {
  it('en un servidor lleva al canal, y al hilo si es de uno', () => {
    expect(notificationDestination(base)).toEqual({
      kind: 'channel',
      serverId: 's1',
      channelId: 'c1',
      threadId: null,
      messageId: 'm1',
    });
    expect(notificationDestination({ ...base, reason: 'thread_reply', threadId: 'm0' })).toMatchObject({
      kind: 'channel',
      threadId: 'm0',
    });
  });

  it('un DM (serverId null) lleva a la conversación con quien escribió, sea cual sea el motivo', () => {
    for (const reason of ['dm', 'mention'] as const) {
      expect(notificationDestination({ ...base, reason, serverId: null, channelId: 'dm-u1-u2' })).toEqual({
        kind: 'dm',
        userId: 'u2',
        channelId: 'dm-u1-u2',
        threadId: null,
        messageId: 'm1',
      });
    }
  });
});
