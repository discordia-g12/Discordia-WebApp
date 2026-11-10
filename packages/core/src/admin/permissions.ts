import { PERMISSION_BITS } from '../api/roles';
import type { Channel, Server } from '../types';

/**
 * Permisos de un rol tal como se muestran en los ajustes del servidor (web y mobile), agrupados. Los ids
 * son los de PERMISSION_BITS; los que todavía no tienen bit en el backend (VIEW_AUDIT_LOG) se
 * muestran sin poder activarse (hasBackendBit).
 */
export const PERMISSION_CATEGORIES = [
  {
    category: 'Permisos generales',
    permissions: [
      { id: 'ADMINISTRATOR', name: 'Administrador', desc: 'Tiene todos los permisos e ignora los de cada canal.' },
      { id: 'MANAGE_SERVER', name: 'Gestionar servidor', desc: 'Cambiar el nombre, el ícono y la dirección del servidor.' },
      { id: 'MANAGE_ROLES', name: 'Gestionar roles', desc: 'Crear, editar y borrar roles por debajo de este.' },
      { id: 'MANAGE_CHANNELS', name: 'Gestionar canales', desc: 'Crear, ordenar y borrar canales del servidor.' },
      { id: 'VIEW_AUDIT_LOG', name: 'Ver registro de auditoría', desc: 'Ver las acciones de administración del servidor.' },
    ],
  },
  {
    category: 'Permisos de miembros',
    permissions: [
      { id: 'CREATE_INSTANT_INVITE', name: 'Crear invitaciones', desc: 'Crear enlaces de invitación permanentes y temporales.' },
      { id: 'KICK_MEMBERS', name: 'Expulsar miembros', desc: 'Sacar miembros del servidor, con un motivo opcional.' },
      { id: 'BAN_MEMBERS', name: 'Banear miembros', desc: 'Banear cuentas y borrar sus mensajes recientes.' },
      { id: 'CHANGE_NICKNAME', name: 'Cambiar apodo', desc: 'Que cada miembro elija su apodo en el servidor.' },
    ],
  },
  {
    category: 'Permisos de texto',
    permissions: [
      { id: 'SEND_MESSAGES', name: 'Enviar mensajes', desc: 'Escribir en los canales de texto.' },
      { id: 'ATTACH_FILES', name: 'Adjuntar archivos', desc: 'Subir imágenes, videos, audios y documentos.' },
      { id: 'ADD_REACTIONS', name: 'Reaccionar', desc: 'Agregar reacciones nuevas a los mensajes.' },
      { id: 'MENTION_EVERYONE', name: 'Mencionar @everyone y roles', desc: 'Avisar a todos los que ven el canal con @everyone y mencionar roles.' },
      { id: 'MANAGE_MESSAGES', name: 'Gestionar mensajes', desc: 'Borrar y fijar mensajes de otros miembros.' },
    ],
  },
  {
    category: 'Permisos de voz',
    permissions: [
      { id: 'CONNECT', name: 'Conectarse', desc: 'Entrar a los canales de voz y escuchar.' },
      { id: 'SPEAK', name: 'Hablar', desc: 'Transmitir el micrófono en los canales de voz.' },
      { id: 'VIDEO', name: 'Video', desc: 'Prender la cámara en los canales de voz.' },
      { id: 'SCREEN_SHARE', name: 'Compartir pantalla', desc: 'Transmitir la pantalla en los canales de voz.' },
      { id: 'MUTE_MEMBERS', name: 'Silenciar miembros', desc: 'Silenciar a otros en los canales de voz.' },
      { id: 'DEAFEN_MEMBERS', name: 'Ensordecer miembros', desc: 'Quitarles el audio a otros en los canales de voz.' },
      { id: 'MOVE_MEMBERS', name: 'Mover miembros', desc: 'Pasar gente de un canal de voz a otro.' },
    ],
  },
];

/**
 * El usuario puede hacer algo en el servidor: es el dueño, tiene ADMINISTRATOR o el permiso (permisos a
 * nivel servidor, que vienen con cada servidor en myPermissions). Sin myPermissions (backend viejo) solo
 * el dueño. Para mostrar u ocultar acciones: el backend vuelve a chequear cada una.
 */
export function canInServer(server: Pick<Server, 'ownerId' | 'myPermissions'> | null | undefined, userId: string, permission: string): boolean {
  if (!server) return false;
  if (server.ownerId === userId) return true;
  const permissions = server.myPermissions ?? [];
  return permissions.includes('ADMINISTRATOR') || permissions.includes(permission);
}

/**
 * Igual que canInServer, pero en un canal: usa los permisos del canal (que incluyen sus overrides) si
 * vinieron del backend; si no (p. ej. un canal recién creado), los del servidor.
 */
export function canInChannel(
  server: Pick<Server, 'ownerId' | 'myPermissions'> | null | undefined,
  channel: Pick<Channel, 'myPermissions'>,
  userId: string,
  permission: string
): boolean {
  if (!channel.myPermissions || !server || server.ownerId === userId) return canInServer(server, userId, permission);
  return channel.myPermissions.includes('ADMINISTRATOR') || channel.myPermissions.includes(permission);
}

/**
 * Canal de voz al que el usuario no puede entrar (sin CONNECT): se muestra con candado. Si el backend no
 * mandó permisos no se bloquea, y decide el join.
 */
export function isVoiceChannelLocked(
  server: Pick<Server, 'ownerId' | 'myPermissions'> | null | undefined,
  channel: Pick<Channel, 'type' | 'myPermissions'>,
  userId: string
): boolean {
  if (channel.type !== 'voice' || !server) return false;
  if (!channel.myPermissions && !server.myPermissions) return false;
  return !canInChannel(server, channel, userId, 'CONNECT');
}

/**
 * Permisos que habilitan cada sección de los ajustes del servidor (alcanza con uno), en web y mobile.
 * Sin entrada: la ven todos. Las que todavía no guardan nada en el backend (moderación, emojis) quedan
 * con gestionar servidor.
 */
export const SETTINGS_SECTION_PERMISSIONS: Record<string, string[]> = {
  overview: ['MANAGE_SERVER'],
  roles: ['MANAGE_ROLES'],
  members: ['MANAGE_ROLES', 'MUTE_MEMBERS', 'KICK_MEMBERS', 'BAN_MEMBERS'],
  bans: ['BAN_MEMBERS'],
  channels: ['MANAGE_CHANNELS'],
  moderation: ['MANAGE_SERVER', 'ADMINISTRATOR', 'BAN_MEMBERS', 'KICK_MEMBERS', 'MANAGE_ROLES', 'MANAGE_CHANNELS'],
  audit: ['MANAGE_SERVER', 'ADMINISTRATOR', 'BAN_MEMBERS', 'KICK_MEMBERS', 'MANAGE_ROLES', 'MANAGE_CHANNELS'],
  emojis: ['MANAGE_SERVER'],
};

/** La sección de ajustes se muestra: no pide permisos o el usuario tiene alguno de los suyos. */
export function canSeeSettingsSection(
  server: Pick<Server, 'ownerId' | 'myPermissions'> | null | undefined,
  userId: string,
  section: string
): boolean {
  const required = SETTINGS_SECTION_PERMISSIONS[section];
  return !required || required.some((permission) => canInServer(server, userId, permission));
}

/** Qué puede hacer el usuario con los miembros (sección MIEMBROS de los ajustes). */
export interface MemberActions {
  manageRoles: boolean;
  mute: boolean;
  kick: boolean;
  ban: boolean;
}

export function memberActionsIn(server: Pick<Server, 'ownerId' | 'myPermissions'> | null | undefined, userId: string): MemberActions {
  return {
    manageRoles: canInServer(server, userId, 'MANAGE_ROLES'),
    mute: canInServer(server, userId, 'MUTE_MEMBERS'),
    kick: canInServer(server, userId, 'KICK_MEMBERS'),
    ban: canInServer(server, userId, 'BAN_MEMBERS'),
  };
}

/** El permiso se puede guardar: tiene bit en el bitmask del backend. */
export const hasBackendBit = (permissionId: string) => PERMISSION_BITS[permissionId] !== undefined;

/** Colores que se ofrecen al crear o editar un rol (se guardan en el backend). */
export const PRESET_ROLE_COLORS = [
  '#99aab5', // Default
  '#5865f2', // Blurple
  '#23a55a', // Green
  '#f0b232', // Amber
  '#eb459e', // Fuchsia
  '#da373c', // Red
  '#00a8fc', // Cyan
  '#9b59b6', // Violet
];
