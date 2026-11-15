import { describe, it, expect } from 'vitest';
import type { Conversation, Relationship } from '../../types';
import { DM_COMPOSER_MESSAGES, dmActions } from '../actions';

const conversation = (status: Conversation['status'], requestedBy: string): Conversation => ({
  id: 'dm-1',
  status,
  requestedBy,
  otherUserId: 'other',
  unreadCount: 0,
});

describe('dmActions: composer', () => {
  it('sin conversación se puede escribir: nace con el primer mensaje', () => {
    expect(dmActions({ relationship: 'none', conversation: null }).composer).toBe('open');
  });

  it('quien inició la solicitud espera respuesta, aunque se la hayan rechazado', () => {
    for (const status of ['pending', 'declined'] as const) {
      const actions = dmActions({ relationship: 'none', conversation: conversation(status, 'me') });
      expect(actions.composer).toBe('waiting_reply');
      expect(actions.composerMessage).toBe(DM_COMPOSER_MESSAGES.waiting_reply);
    }
  });

  it('quien la recibe no puede responder sin aceptar', () => {
    const actions = dmActions({ relationship: 'none', conversation: conversation('pending', 'other') });

    expect(actions.composer).toBe('message_request');
    expect(actions.canRespondMessageRequest).toBe(true);
    expect(actions.canBlock).toBe(true);
    expect(actions.composerMessage).toBeNull();
  });

  it('aceptar el mensaje libera la conversación sin hacerlos amigos', () => {
    const actions = dmActions({ relationship: 'none', conversation: conversation('accepted', 'other') });

    expect(actions.composer).toBe('open');
    expect(actions.canAddFriend).toBe(true);
  });

  it('entre amigos no queda pendiente aunque el caché esté viejo', () => {
    expect(dmActions({ relationship: 'friend', conversation: conversation('pending', 'me') }).composer).toBe('open');
  });

  it('quien bloqueó ve "desbloqueá para escribir" y puede desbloquear', () => {
    const actions = dmActions({ relationship: 'blocked', conversation: conversation('accepted', 'me') });

    expect(actions.composer).toBe('blocked');
    expect(actions.composerMessage).toBe(DM_COMPOSER_MESSAGES.blocked);
    expect(actions.canUnblock).toBe(true);
    expect(actions.canBlock).toBe(false);
    expect(actions.canMessage).toBe(false);
  });

  it('el bloqueo gana sobre una solicitud de mensaje', () => {
    const actions = dmActions({ relationship: 'blocked', conversation: conversation('pending', 'other') });

    expect(actions.composer).toBe('blocked');
    expect(actions.canRespondMessageRequest).toBe(false);
  });

  it('si el otro bloqueó, el mensaje es genérico', () => {
    const actions = dmActions({ relationship: 'none', conversation: conversation('accepted', 'me'), canMessage: false });

    expect(actions.composer).toBe('undeliverable');
    expect(actions.composerMessage).not.toMatch(/bloque/i);
    expect(actions.canAddFriend).toBe(true);
  });

  it('una solicitud enviada sigue esperando aunque no se pueda entregar: no delata el bloqueo', () => {
    const actions = dmActions({ relationship: 'none', conversation: conversation('pending', 'me'), canMessage: false });

    expect(actions.composer).toBe('waiting_reply');
  });
});

describe('dmActions: amistad', () => {
  const cases: [Relationship, string[]][] = [
    ['none', ['canAddFriend']],
    ['request_sent', ['canCancelFriendRequest']],
    ['request_received', ['canRespondFriendRequest']],
    ['friend', ['canRemoveFriend']],
    ['blocked', []],
  ];

  it.each(cases)('con relación %s muestra solo la acción que corresponde', (relationship, expected) => {
    const actions = dmActions({ relationship });
    const shown = (['canAddFriend', 'canCancelFriendRequest', 'canRespondFriendRequest', 'canRemoveFriend'] as const).filter(
      (key) => actions[key]
    );

    expect(shown).toEqual(expected);
  });

  it('agregar amigo es independiente de la solicitud de mensaje', () => {
    const actions = dmActions({ relationship: 'none', conversation: conversation('pending', 'other') });

    expect(actions.canAddFriend).toBe(true);
    expect(actions.canRespondMessageRequest).toBe(true);
  });
});

describe('dmActions: llamar', () => {
  it('se puede llamar si la conversación existe y se puede escribir', () => {
    expect(dmActions({ relationship: 'friend', conversation: conversation('accepted', 'other') }).canCall).toBe(true);
    expect(dmActions({ relationship: 'none', conversation: conversation('accepted', 'me') }).canCall).toBe(true);
  });

  it('entre amigos, una conversación pendiente vieja en el caché no impide llamar', () => {
    expect(dmActions({ relationship: 'friend', conversation: conversation('pending', 'me') }).canCall).toBe(true);
  });

  it('no se puede sin conversación, con una solicitud sin aceptar, bloqueado o sin entrega', () => {
    expect(dmActions({ relationship: 'friend', conversation: null }).canCall).toBe(false);
    expect(dmActions({ relationship: 'none', conversation: conversation('pending', 'me') }).canCall).toBe(false);
    expect(dmActions({ relationship: 'none', conversation: conversation('pending', 'other') }).canCall).toBe(false);
    expect(dmActions({ relationship: 'blocked', conversation: conversation('accepted', 'other') }).canCall).toBe(false);
    const undeliverable = dmActions({ relationship: 'none', conversation: conversation('accepted', 'other'), canMessage: false });
    expect(undeliverable.canCall).toBe(false);
  });
});
