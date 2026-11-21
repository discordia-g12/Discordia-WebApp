import { describe, it, expect } from 'vitest';
import type { Message } from '../../types';
import { canPinMessage, isDirectChannelId, sortPinnedMessages } from '../pins';

const msg = (over: Partial<Message> & { status?: string } = {}) =>
  ({ id: 'm1', content: 'hola', authorId: 'u1', channelId: 'c1', timestamp: '', ...over }) as Message & { status?: string };

describe('canPinMessage', () => {
  it('en un DM puede cualquiera de los dos participantes', () => {
    expect(canPinMessage(msg(), { isDirect: true })).toBe(true);
  });

  it('en un canal hace falta MANAGE_MESSAGES', () => {
    expect(canPinMessage(msg(), { isDirect: false, canManageMessages: true })).toBe(true);
    expect(canPinMessage(msg(), { isDirect: false, canManageMessages: false })).toBe(false);
    expect(canPinMessage(msg(), { isDirect: false })).toBe(false);
  });

  it('no se fija un mensaje borrado, de sistema o que el servidor todavía no confirmó', () => {
    expect(canPinMessage(msg({ type: 'deleted' }), { isDirect: true })).toBe(false);
    expect(canPinMessage(msg({ type: 'system' }), { isDirect: true })).toBe(false);
    expect(canPinMessage(msg({ status: 'pending' }), { isDirect: true })).toBe(false);
    expect(canPinMessage(msg({ status: 'failed' }), { isDirect: true })).toBe(false);
    expect(canPinMessage(msg({ status: 'sent' }), { isDirect: true })).toBe(true);
  });
});

describe('sortPinnedMessages', () => {
  it('ordena del fijado más reciente al más viejo, sin mutar la lista', () => {
    const list = [
      msg({ id: 'a', pinnedAt: '2026-01-01T00:00:00.000Z' }),
      msg({ id: 'b', pinnedAt: '2026-03-01T00:00:00.000Z' }),
      msg({ id: 'c', pinnedAt: '2026-02-01T00:00:00.000Z' }),
    ];
    expect(sortPinnedMessages(list).map((m) => m.id)).toEqual(['b', 'c', 'a']);
    expect(list.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('isDirectChannelId', () => {
  it('reconoce los DMs por el prefijo dm-', () => {
    expect(isDirectChannelId('dm-123')).toBe(true);
    expect(isDirectChannelId('c1')).toBe(false);
    expect(isDirectChannelId(null)).toBe(false);
  });
});
