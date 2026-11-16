import { describe, it, expect } from 'vitest';
import {
  CHANNEL_OVERRIDE_PERMISSIONS,
  canInChannel,
  canInServer,
  canSeeSettingsSection,
  isVoiceChannelLocked,
  memberActionsIn,
  overrideStateOf,
  sameOverride,
  withOverrideState,
} from '../permissions';
import { PERMISSION_BITS } from '../../api/roles';

const server = (myPermissions?: string[]) => ({ ownerId: 'owner', myPermissions });

describe('canInServer', () => {
  it('el dueño puede todo, aunque no tenga el permiso en myPermissions', () => {
    expect(canInServer(server([]), 'owner', 'MANAGE_CHANNELS')).toBe(true);
  });

  it('un miembro puede lo que tiene, y todo con ADMINISTRATOR', () => {
    expect(canInServer(server(['MANAGE_CHANNELS']), 'user', 'MANAGE_CHANNELS')).toBe(true);
    expect(canInServer(server(['MANAGE_CHANNELS']), 'user', 'BAN_MEMBERS')).toBe(false);
    expect(canInServer(server(['ADMINISTRATOR']), 'user', 'BAN_MEMBERS')).toBe(true);
  });

  it('sin myPermissions (backend viejo) o sin servidor, un miembro no puede nada', () => {
    expect(canInServer(server(), 'user', 'MANAGE_CHANNELS')).toBe(false);
    expect(canInServer(null, 'owner', 'MANAGE_CHANNELS')).toBe(false);
  });
});

describe('canInChannel', () => {
  it('usa los permisos del canal (con sus overrides) si vinieron del backend', () => {
    const channel = { myPermissions: ['VIEW_CHANNELS'] };
    expect(canInChannel(server(['CONNECT']), channel, 'user', 'CONNECT')).toBe(false);
    expect(canInChannel(server([]), { myPermissions: ['CONNECT'] }, 'user', 'CONNECT')).toBe(true);
  });

  it('sin permisos del canal usa los del servidor; el dueño siempre puede', () => {
    expect(canInChannel(server(['CONNECT']), {}, 'user', 'CONNECT')).toBe(true);
    expect(canInChannel(server([]), { myPermissions: [] }, 'owner', 'CONNECT')).toBe(true);
  });
});

describe('isVoiceChannelLocked', () => {
  it('bloquea un canal de voz sin CONNECT, pero no si el backend no mandó permisos', () => {
    expect(isVoiceChannelLocked(server([]), { type: 'voice', myPermissions: ['VIEW_CHANNELS'] }, 'user')).toBe(true);
    expect(isVoiceChannelLocked(server(['CONNECT']), { type: 'voice', myPermissions: ['CONNECT'] }, 'user')).toBe(false);
    expect(isVoiceChannelLocked(server(), { type: 'voice' }, 'user')).toBe(false);
    expect(isVoiceChannelLocked(server([]), { type: 'text', myPermissions: [] }, 'user')).toBe(false);
  });
});

describe('canSeeSettingsSection', () => {
  it('alcanza con uno de los permisos de la sección; las que no piden ninguno las ven todos', () => {
    expect(canSeeSettingsSection(server(['KICK_MEMBERS']), 'user', 'members')).toBe(true);
    expect(canSeeSettingsSection(server(['KICK_MEMBERS']), 'user', 'roles')).toBe(false);
    expect(canSeeSettingsSection(server([]), 'user', 'notifications')).toBe(true);
  });
});

describe('memberActionsIn', () => {
  it('cada acción sobre los miembros depende de su permiso', () => {
    expect(memberActionsIn(server(['MUTE_MEMBERS']), 'user')).toEqual({
      manageRoles: false,
      mute: true,
      kick: false,
      ban: false,
    });
  });
});

describe('excepciones de un rol en un canal', () => {
  const override = { allow: ['SEND_MESSAGES'], deny: ['VIEW_CHANNELS'] };

  it('overrideStateOf dice si el permiso se permite, se niega o se hereda', () => {
    expect(overrideStateOf(override, 'SEND_MESSAGES')).toBe('allow');
    expect(overrideStateOf(override, 'VIEW_CHANNELS')).toBe('deny');
    expect(overrideStateOf(override, 'ATTACH_FILES')).toBe('inherit');
  });

  it('withOverrideState mueve el permiso sin dejarlo permitido y negado a la vez', () => {
    expect(withOverrideState(override, 'VIEW_CHANNELS', 'allow')).toEqual({ allow: ['SEND_MESSAGES', 'VIEW_CHANNELS'], deny: [] });
    expect(withOverrideState(override, 'SEND_MESSAGES', 'inherit')).toEqual({ allow: [], deny: ['VIEW_CHANNELS'] });
    expect(withOverrideState(override, 'ATTACH_FILES', 'deny')).toEqual({ allow: ['SEND_MESSAGES'], deny: ['VIEW_CHANNELS', 'ATTACH_FILES'] });
  });

  it('sameOverride compara sin importar el orden', () => {
    expect(sameOverride({ allow: ['A', 'B'], deny: [] }, { allow: ['B', 'A'], deny: [] })).toBe(true);
    expect(sameOverride({ allow: ['A'], deny: [] }, { allow: [], deny: ['A'] })).toBe(false);
  });

  it('solo ofrece permisos con bit en el backend y nunca ADMINISTRATOR', () => {
    for (const permissions of Object.values(CHANNEL_OVERRIDE_PERMISSIONS)) {
      for (const { id } of permissions) {
        expect(PERMISSION_BITS[id]).toBeDefined();
        expect(id).not.toBe('ADMINISTRATOR');
      }
    }
  });
});
