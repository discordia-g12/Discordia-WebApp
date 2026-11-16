import { PERMISSION_BITS } from '../api/roles';
import type { Channel, ChannelType, Server } from '../types';

/**
 * Permisos de un rol tal como se muestran en los ajustes del servidor (web y mobile), agrupados. Los ids
 * son los de PERMISSION_BITS.
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
 * Permisos que se pueden sobrescribir para un rol en un canal (#18), según el tipo de canal. Solo los que
 * se chequean por canal; ADMINISTRATOR y los de servidor no (el backend rechaza ADMINISTRATOR).
 */
const TEXT_CHANNEL_OVERRIDE_PERMISSIONS = [
  { id: 'VIEW_CHANNELS', name: 'Ver canal', desc: 'Leer el canal y su historial.' },
  { id: 'SEND_MESSAGES', name: 'Enviar mensajes', desc: 'Escribir en el canal.' },
  { id: 'ATTACH_FILES', name: 'Adjuntar archivos', desc: 'Subir imágenes, videos, audios y documentos.' },
  { id: 'ADD_REACTIONS', name: 'Reaccionar', desc: 'Agregar reacciones nuevas a los mensajes.' },
  { id: 'MENTION_EVERYONE', name: 'Mencionar @everyone y roles', desc: 'Avisar a todos con @everyone y mencionar roles.' },
  { id: 'MANAGE_MESSAGES', name: 'Gestionar mensajes', desc: 'Borrar y fijar mensajes de otros miembros.' },
];

export const CHANNEL_OVERRIDE_PERMISSIONS: Record<ChannelType, { id: string; name: string; desc: string }[]> = {
  text: TEXT_CHANNEL_OVERRIDE_PERMISSIONS,
  announcement: TEXT_CHANNEL_OVERRIDE_PERMISSIONS,
  voice: [
    { id: 'VIEW_CHANNELS', name: 'Ver canal', desc: 'Ver el canal en la lista.' },
    { id: 'CONNECT', name: 'Conectarse', desc: 'Entrar al canal y escuchar.' },
    { id: 'SPEAK', name: 'Hablar', desc: 'Transmitir el micrófono.' },
    { id: 'VIDEO', name: 'Video', desc: 'Prender la cámara.' },
    { id: 'SCREEN_SHARE', name: 'Compartir pantalla', desc: 'Transmitir la pantalla.' },
    { id: 'MUTE_MEMBERS', name: 'Silenciar miembros', desc: 'Silenciar a otros en el canal.' },
    { id: 'DEAFEN_MEMBERS', name: 'Ensordecer miembros', desc: 'Quitarles el audio a otros en el canal.' },
    { id: 'MOVE_MEMBERS', name: 'Mover miembros', desc: 'Pasar gente de este canal a otro.' },
  ],
};

/** Estado de un permiso en la excepción de un rol en un canal. */
export type OverrideState = 'inherit' | 'allow' | 'deny';

export function overrideStateOf(override: { allow: string[]; deny: string[] }, permission: string): OverrideState {
  if (override.allow.includes(permission)) return 'allow';
  if (override.deny.includes(permission)) return 'deny';
  return 'inherit';
}

/** La excepción con `permission` pasado a `state` (un permiso nunca queda permitido y negado a la vez). */
export function withOverrideState(
  override: { allow: string[]; deny: string[] },
  permission: string,
  state: OverrideState
): { allow: string[]; deny: string[] } {
  const allow = override.allow.filter((p) => p !== permission);
  const deny = override.deny.filter((p) => p !== permission);
  if (state === 'allow') allow.push(permission);
  if (state === 'deny') deny.push(permission);
  return { allow, deny };
}

/** Las dos excepciones tienen los mismos permisos (sin importar el orden). */
export function sameOverride(a: { allow: string[]; deny: string[] }, b: { allow: string[]; deny: string[] }): boolean {
  const same = (x: string[], y: string[]) => x.length === y.length && x.every((p) => y.includes(p));
  return same(a.allow, b.allow) && same(a.deny, b.deny);
}

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
  moderation: ['MANAGE_SERVER', 'ADMINISTRATOR', 'BAN_MEMBERS', 'KICK_MEMBERS', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'VIEW_AUDIT_LOG'],
  audit: ['MANAGE_SERVER', 'ADMINISTRATOR', 'BAN_MEMBERS', 'KICK_MEMBERS', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'VIEW_AUDIT_LOG'],
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
