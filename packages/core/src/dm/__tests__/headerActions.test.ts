import { describe, it, expect } from 'vitest';
import type { Relationship } from '../../types';
import { dmActions } from '../actions';
import { DM_HEADER_COMPACT_ICONS, dmHeaderActions, type DmHeaderInput } from '../headerActions';

const conversation = { id: 'dm-1', status: 'accepted' as const, requestedBy: 'other', otherUserId: 'other', unreadCount: 0 };

function layout(relationship: Relationship, extra: Partial<DmHeaderInput> = {}) {
  return dmHeaderActions({
    name: 'Ana',
    actions: dmActions({ relationship, conversation }),
    hasConversation: true,
    pinned: { count: 0, open: false },
    ...extra,
  });
}

const ids = (actions: { id: string }[]) => actions.map((a) => a.id);

describe('dmHeaderActions', () => {
  it('entre amigos: llamar, fijados y perfil como íconos; eliminar y bloquear en el menú', () => {
    const { icons, menu } = layout('friend');

    expect(ids(icons)).toEqual(['call', 'pins', 'profile']);
    expect(ids(menu)).toEqual(['remove-friend', 'block']);
    expect(menu.every((a) => a.destructive)).toBe(true);
  });

  it('sin amistad: agregar amigo va entre fijados y perfil', () => {
    expect(ids(layout('none').icons)).toEqual(['call', 'pins', 'add-friend', 'profile']);
  });

  it('solicitud recibida: aceptar a la vista, rechazar en el menú', () => {
    const { icons, menu } = layout('request_received');

    expect(ids(icons)).toContain('accept-friend');
    expect(ids(menu)).toEqual(['decline-friend', 'block']);
  });

  it('solicitud enviada: cancelar a la vista', () => {
    expect(ids(layout('request_sent').icons)).toContain('cancel-friend-request');
  });

  it('mientras se manda la solicitud, el ícono queda deshabilitado', () => {
    const addFriend = layout('none', { friendRequestSending: true }).icons.find((a) => a.id === 'add-friend');

    expect(addFriend).toMatchObject({ icon: 'user-check', disabled: true });
  });

  it('bloqueado: sin llamar ni bloquear, y desbloquear a la vista', () => {
    const { icons, menu } = layout('blocked');

    expect(ids(icons)).toEqual(['pins', 'profile', 'unblock']);
    expect(menu).toEqual([]);
  });

  it('sin conversación todavía: ni llamar ni fijados', () => {
    expect(ids(layout('friend', { hasConversation: false }).icons)).toEqual(['profile']);
  });

  it('en una llamada en este chat no se ofrece llamar', () => {
    expect(ids(layout('friend', { inCallHere: true }).icons)).not.toContain('call');
  });

  it('sin panel de fijados (mobile) ni ícono de perfil', () => {
    expect(ids(layout('friend', { pinned: undefined, showProfile: false }).icons)).toEqual(['call']);
  });

  it('fijados: cantidad y estado del panel', () => {
    const pins = layout('friend', { pinned: { count: 2, open: true } }).icons.find((a) => a.id === 'pins');
    expect(pins).toMatchObject({ badge: 2, pressed: true });
    expect(layout('friend').icons.find((a) => a.id === 'pins')).not.toHaveProperty('badge');
  });

  it('en pantallas angostas lo que no entra pasa al menú, primero y en orden', () => {
    const { icons, menu } = layout('none', { maxIcons: DM_HEADER_COMPACT_ICONS });

    expect(ids(icons)).toEqual(['call', 'pins', 'add-friend']);
    expect(ids(menu)).toEqual(['profile', 'block']);
  });

  it('los nombres accesibles llevan el nombre de la persona', () => {
    expect(layout('none').icons.find((a) => a.id === 'call')?.label).toBe('Llamar a Ana');
  });
});
