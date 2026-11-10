/**
 * Tipos de dominio de Discordia, compartidos por la web y la app mobile: usuarios, servidores, canales,
 * roles, mensajería, y los DTO tal como los devuelve el backend. Los tipos de interfaz (vistas, modales)
 * quedan en cada app.
 */

import type { MessageMentions } from './chat/mentions';

/** Estados de presencia y disponibilidad de un usuario. */
export type Status = 'online' | 'idle' | 'dnd' | 'offline' | 'invisible';

/** Tipos de canal soportados en un servidor de Discordia. */
export type ChannelType = 'text' | 'voice' | 'announcement';

/** Naturaleza del mensaje dentro del flujo de chat. */
export type MessageType = 'normal' | 'system' | 'deleted';

/** Adjunto multimedia o documental asociado a un mensaje. */
export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  size?: string | number;
  type?: string;
  contentType?: string;
}

/** Previsualización incrustada de enlaces o contenido externo. */
export interface MessageEmbed {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  color?: string;
}

/** Reacción con emoji aplicada por uno o más usuarios a un mensaje. */
export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  emojiId?: string;
  reacted?: boolean;
  hasReacted?: boolean;
}

/** Entidad de usuario registrada en la plataforma. */
export interface User {
  id: string;
  name?: string;
  username: string;
  discriminator?: string;
  displayName: string;
  color?: string;
  avatar?: string;
  avatarUrl?: string;
  avatarPreview?: string;
  banner?: string;
  bannerColor?: string;
  bio?: string;
  customStatus?: string;
  status: Status;
  email?: string;
  phone?: string;
  isStaff?: boolean;
  isPremium?: boolean;
  isBoosting?: boolean;
  isSuspended?: boolean;
  suspended?: boolean;
  premiumSince?: string;
  badges?: string[];
  joinedAt?: string;
  createdAt?: string;
  twoFactorEnabled?: boolean;
  points?: number;
  roleIds?: string[];
  roles?: string[];
}

/** Rol asignable con permisos y estilo cromático en un servidor. */
export interface Role {
  id: string;
  name: string;
  color: string;
  hoist?: boolean;
  position?: number;
  permissions: string[];
  isDefault?: boolean;
  memberCount?: number;
}

/** DTO de rol retornado por Server-Roles-Core-Service */
export interface RoleBackendResponse {
  id: string;
  name: string;
  color: string | null;
  position: number;
  permissions_bitmask: number;
  is_default: boolean;
}

/** DTO de miembro de un rol retornado por Server-Roles-Core-Service */
export interface RoleMemberBackendResponse {
  id: string;
  user_id: string;
  nickname: string | null;
  joined_at: string;
}

/** Miembro de un servidor que tiene asignado un rol determinado. */
export interface RoleMember {
  id: string;
  userId: string;
  nickname: string | null;
  joinedAt: string;
}

/** DTO de un baneo retornado por Server-Roles-Core-Service */
export interface ServerBanBackendResponse {
  id: string;
  server_id: string;
  user_id: string;
  banned_by: string | null;
  reason: string | null;
  created_at: string;
}

/** Usuario baneado de un servidor. */
export interface ServerBan {
  id: string;
  serverId: string;
  userId: string;
  bannedBy: string | null;
  reason: string | null;
  createdAt: string;
}

export interface ServerOwnershipTransferBackendResponse {
  id: string;
  server_id: string;
  sender_id: string;
  target_user_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  updated_at?: string | null;
}

export interface ServerOwnershipTransfer {
  id: string;
  serverId: string;
  senderId: string;
  targetUserId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string | null;
}

/** DTO de miembro de un servidor retornado por Server-Roles-Core-Service */
export interface ServerMemberBackendResponse {
  id: string;
  user_id: string;
  nickname: string | null;
  role_ids: string[];
}

/** DTO de una página de miembros retornada por Server-Roles-Core-Service */
export interface ServerMemberPageBackendResponse {
  items: ServerMemberBackendResponse[];
  total: number;
  limit: number;
  offset: number;
}

/** Miembro de un servidor con los ids de los roles que tiene asignados. */
export interface ServerMember {
  id: string;
  userId: string;
  nickname: string | null;
  roleIds: string[];
}

/** Página de miembros de un servidor. */
export interface ServerMemberPage {
  items: ServerMember[];
  total: number;
  limit: number;
  offset: number;
}

/** DTO de canal retornado por Server-Roles-Core-Service */
export interface ChannelBackendResponse {
  id: string;
  name: string;
  type: ChannelType;
  server_id: string;
  category_id?: string | null;
  position: number;
  topic?: string | null;
  /** Permisos efectivos del usuario que pide en este canal (con los overrides del canal). */
  my_permissions?: number;
}

export interface CategoryBackendResponse {
  id: string;
  server_id: string;
  name: string;
  position: number;
}

/** DTO de servidor retornado por Server-Roles-Core-Service */
export interface ServerBackendResponse {
  id: string;
  name: string;
  owner_id: string;
  description?: string | null;
  icon_url?: string | null;
  created_at: string;
  /** Permisos efectivos del usuario que pide (bitmask, mismos bits que los roles). */
  my_permissions?: number;
  channels: ChannelBackendResponse[];
  categories?: CategoryBackendResponse[];
}

/** DTO de mensaje retornado por Chat-Engine-Service */
export interface MessageBackendPayload {
  id: string;
  content: string;
  authorId: string;
  channelId: string;
  createdAt: string;
  edited?: boolean;
  editedAt?: string | null;
  editedTimestamp?: string | null;
  type?: string;
  mentions?: MessageMentions;
  attachments?: MessageAttachment[];
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
    emojiId?: string;
  }>;
}

/** Canal individual perteneciente a una categoría de servidor. */
export interface Channel {
  id: string;
  serverId?: string;
  name: string;
  type: ChannelType;
  topic?: string;
  categoryId?: string | null;
  position?: number;
  isPrivate?: boolean;
  unreadCount?: number;
  unread?: number;
  mentions?: number;
  participants?: string[];
  userLimit?: number;
  bitrate?: number;
  /** Permisos del usuario actual en el canal (ids de PERMISSION_BITS). Ver canInChannel. */
  myPermissions?: string[];
}

/** Agrupador de canales en la barra lateral del servidor. */
export interface Category {
  id: string;
  serverId?: string;
  name: string;
  channels: Channel[];
  position?: number;
  collapsed?: boolean;
}

/** Comunidad o servidor que contiene categorías, canales y miembros. */
export interface Server {
  id: string;
  name: string;
  ownerId: string;
  /** Permisos del usuario actual en el servidor (ids de PERMISSION_BITS). Ver canInServer. */
  myPermissions?: string[];
  icon?: string;
  iconUrl?: string;
  banner?: string;
  color?: string;
  description?: string;
  channels?: Channel[];
  categories: Category[];
  roles: Role[];
  members: User[];
  memberCount?: number;
  boostLevel: number;
  boostCount: number;
  unreadCount?: number;
  unread?: boolean;
  mentions?: number;
  muted?: boolean;
  vanityUrl?: string;
  createdAt?: string;
}

/** Mensaje individual publicado en un canal o chat directo. */
export interface Message {
  id: string;
  content: string;
  authorId: string;
  channelId: string;
  createdAt?: string;
  timestamp: string;
  userId?: string;
  author?: User;
  editedTimestamp?: string | null;
  editedAt?: string | null;
  edited?: boolean;
  type?: MessageType;
  reactions?: Reaction[];
  attachments?: MessageAttachment[];
  embeds?: MessageEmbed[];
  /** Menciones que notifican, según Chat-Engine (#46). Los mensajes anteriores las traen vacías. */
  mentions?: MessageMentions;
  replyToId?: string | null;
  replyTo?: Message | null;
  isPinned?: boolean;
  fileAttachment?: { name: string; size: string; type?: string };
  imageUrl?: string;
  isNew?: boolean;
}

/**
 * Hilo simulado de la web, anterior a los DMs reales.
 * @deprecated Usar Conversation. Se borra cuando la web deje de usar dmStore.
 */
export interface DirectMessage {
  id: string;
  recipientId: string;
  userId?: string;
  recipient?: User;
  lastMessage?: string;
  lastMessageTimestamp?: string;
  lastTimestamp?: string;
  unreadCount?: number;
  unread?: number;
  pinned?: boolean;
}

/**
 * Relación con otro usuario, según Auth-User-Service. `blocked` es solo "lo bloqueé yo": si el otro me
 * bloqueó a mí, es `none`.
 */
export type Relationship = 'none' | 'friend' | 'request_sent' | 'request_received' | 'blocked';

/** DTO de perfil público retornado por Auth-User-Service */
export interface PublicProfileBackendResponse {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  custom_status: string | null;
  created_at: string;
  relationship: Relationship;
  friend_request_id?: string | null;
}

/** Perfil público de un usuario. Nunca trae email ni nada de sus DMs. */
export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  customStatus: string | null;
  createdAt: string;
  relationship: Relationship;
  /** La solicitud de amistad pendiente entre ambos, si `relationship` es request_sent o request_received. */
  friendRequestId?: string;
}

/** DTO de solicitud de amistad retornado por Auth-User-Service */
export interface FriendRequestBackendResponse {
  id: string;
  user: PublicProfileBackendResponse;
  message: string | null;
  created_at: string;
}

/** Solicitud de amistad. `user` es la otra persona: quien la envió o quien la recibe. */
export interface FriendRequest {
  id: string;
  user: PublicProfile;
  message: string | null;
  createdAt: string;
}

/** Solicitudes de amistad pendientes del usuario autenticado. */
export interface FriendRequests {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

/** Servidor en el que están el usuario autenticado y otro usuario. */
export interface MutualServer {
  id: string;
  name: string;
  iconUrl?: string;
}

/**
 * pending: solicitud de mensaje, todavía sin aceptar. declined: la rechazó el destinatario; quien la
 * inició sigue viéndola como pendiente.
 */
export type ConversationStatus = 'pending' | 'accepted' | 'declined';

/** Vista previa del último mensaje de una conversación. */
export interface ConversationLastMessage {
  content: string;
  authorId: string;
  createdAt: string;
}

/**
 * Conversación directa entre dos usuarios (Chat-Engine). `id` empieza con `dm-` y se usa como channelId
 * en historial, envío, lectura, adjuntos y WebSocket.
 */
export interface Conversation {
  id: string;
  status: ConversationStatus;
  requestedBy: string;
  otherUserId: string;
  lastMessage?: ConversationLastMessage | null;
  unreadCount: number;
}

/** Notificación de evento entrante relevante para el usuario autenticado. */
export interface Notification {
  id: string;
  type: 'mention' | 'dm' | 'reply' | 'reaction' | 'system';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  actorId?: string;
  actor?: User;
  channelId?: string;
  serverId?: string;
  messageId?: string;
}

/** Registro de auditoría administrativa y moderación de un servidor. */
export interface AuditEntry {
  id: string;
  action: string;
  actorId: string;
  actor?: User;
  targetId?: string;
  targetType?: 'user' | 'channel' | 'role' | 'server' | 'message';
  reason?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

/** Punto de datos en la evolución diaria de miembros de un servidor. */
export interface MemberGrowthPoint {
  date: string;
  member_count: number;
  joined: number;
  left: number;
}

/** Período seleccionado para la consulta de crecimiento. */
export interface MemberGrowthPeriod {
  start_date: string;
  end_date: string;
  days: number;
}

/** Respuesta de la API para el gráfico de evolución de miembros. */
export interface MemberGrowthResponse {
  server_id: string;
  period: MemberGrowthPeriod;
  current_member_count: number;
  data: MemberGrowthPoint[];
}

