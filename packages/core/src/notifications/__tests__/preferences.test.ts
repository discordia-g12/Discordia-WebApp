import { describe, it, expect } from 'vitest';
import type { NotificationPreference } from '../../api/notifications';
import { resolveNotificationPreference } from '../preferences';

const now = new Date('2026-11-23T12:00:00.000Z');

function pref(scopeType: NotificationPreference['scopeType'], scopeId: string, over: Partial<NotificationPreference> = {}) {
  return {
    scopeType,
    scopeId,
    serverId: 's1',
    level: null,
    muted: false,
    mutedUntil: null,
    updatedAt: now.toISOString(),
    ...over,
  } satisfies NotificationPreference;
}

const thread = { serverId: 's1', channelId: 'c1', threadId: 't1' };

describe('resolveNotificationPreference (igual que rules.ts del backend)', () => {
  it('sin preferencias: solo menciones en un servidor, todo en un DM', () => {
    expect(resolveNotificationPreference([], thread, now)).toEqual({ level: 'mentions', muted: false });
    expect(resolveNotificationPreference([], { serverId: null, channelId: 'dm-a-b' }, now)).toEqual({
      level: 'all',
      muted: false,
    });
  });

  it('canal pisa servidor, hilo pisa canal; null hereda', () => {
    const prefs = [pref('server', 's1', { level: 'none' }), pref('channel', 'c1', { level: 'all' })];
    expect(resolveNotificationPreference(prefs, { serverId: 's1' }, now).level).toBe('none');
    expect(resolveNotificationPreference(prefs, thread, now).level).toBe('all');
    expect(resolveNotificationPreference([...prefs, pref('thread', 't1', { level: 'mentions' })], thread, now).level).toBe(
      'mentions'
    );
  });

  it('un silencio vigente arriba silencia lo de abajo; uno vencido no', () => {
    expect(resolveNotificationPreference([pref('server', 's1', { muted: true })], thread, now).muted).toBe(true);
    const expired = pref('channel', 'c1', { muted: true, mutedUntil: '2026-11-23T11:00:00.000Z' });
    expect(resolveNotificationPreference([expired], thread, now).muted).toBe(false);
    const running = pref('channel', 'c1', { muted: true, mutedUntil: '2026-11-23T13:00:00.000Z' });
    expect(resolveNotificationPreference([running], thread, now).muted).toBe(true);
  });

  it('ignora preferencias de otros alcances', () => {
    const prefs = [pref('channel', 'otro', { level: 'all', muted: true }), pref('server', 's2', { level: 'none' })];
    expect(resolveNotificationPreference(prefs, thread, now)).toEqual({ level: 'mentions', muted: false });
  });
});
