import { describe, it, expect } from 'vitest';
import { canInServer, canSeeSettingsSection, memberActionsIn } from '../permissions';

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
