import { describe, it, expect } from 'vitest';
import { WAVE_EMOJI, hasWaved, isMemberJoin, memberJoinText, systemMessageUserId, waveCount } from '../system';
import type { Message } from '../../types';

const join = (reactions: Message['reactions'] = []) =>
  ({
    id: 'm1',
    content: '',
    authorId: 'auth0|ana',
    channelId: 'c1',
    timestamp: '2026-11-22T10:00:00.000Z',
    type: 'system',
    system: { event: 'member_join', userId: 'auth0|ana' },
    reactions,
  }) as Message;

describe('mensajes del sistema', () => {
  it('reconoce el aviso de que alguien se unió y a quién se refiere', () => {
    expect(isMemberJoin(join())).toBe(true);
    expect(isMemberJoin({ type: 'normal' })).toBe(false);
    expect(isMemberJoin({ type: 'system' })).toBe(false);
    expect(systemMessageUserId(join())).toBe('auth0|ana');
    expect(systemMessageUserId({ authorId: 'auth0|beto' })).toBe('auth0|beto');
  });

  it('arma "se unió Ana, saludalo", y otro texto para quien se unió', () => {
    const { before, name, after, waveLabel } = memberJoinText('Ana', false);
    expect(`${before}${name}${after}${waveLabel}`).toBe('se unió Ana, saludalo');
    expect(memberJoinText('Ana', true)).toEqual({
      before: 'te uniste al servidor. ¡te damos la bienvenida!',
      name: '',
      after: '',
      waveLabel: null,
    });
  });

  it('cuenta los saludos y sabe si ya saludaste', () => {
    const message = join([{ emoji: WAVE_EMOJI, count: 2, users: ['auth0|beto', 'auth0|carla'] }]);
    expect(waveCount(message)).toBe(2);
    expect(hasWaved(message, 'auth0|beto')).toBe(true);
    expect(hasWaved(message, 'auth0|dani')).toBe(false);
    expect(waveCount(join())).toBe(0);
  });
});
