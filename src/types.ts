/**
 * Definiciones de tipos fundamentales del cliente web Discordia.
 * Modela estados de usuario, jerarquía de servidores, canales, mensajería y UI.
 */

/** Estados de presencia y disponibilidad de un usuario. */
export type Status = 'online' | 'idle' | 'dnd' | 'offline' | 'invisible';

/** Tipos de canal soportados en un servidor de Discordia. */
export type ChannelType = 'text' | 'voice' | 'announcement';

/** Naturaleza del mensaje dentro del flujo de chat. */
export type MessageType = 'normal' | 'system' | 'deleted';

/** Pantallas disponibles dentro del flujo de autenticación y seguridad. */
export type AuthScreen = 'login' | 'register' | 'forgot' | '2fa' | 'verify-email';

/** Vista principal activa renderizada en la aplicación. */
export type AppView =
  | 'chat'
  | 'voice'
  | 'home'
  | 'server-settings'
  | 'user-settings'
  | 'own-profile'
  | 'server-boost'
  | 'premium'
  | 'notifications';

/** Diálogos modales globales que pueden desplegarse en la interfaz. */
export type Modal =
  | 'create-server'
  | 'join-server'
  | 'user-profile'
  | 'invite'
  | 'incoming-call'
  | 'confirm-action'
  | 'search'
  | 'edit-message'
  | null;

/** Acciones críticas que requieren confirmación explícita del usuario. */
export type ConfirmAction =
  | 'ban-member'
  | 'kick-member'
  | 'delete-channel'
  | 'delete-server'
  | 'leave-server'
  | 'transfer-ownership'
  | null;

/** Adjunto multimedia o documental asociado a un mensaje. */
export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  size?: string | number;
  type?: string;
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

/** Errores de validación durante la edición del perfil de usuario. */
export interface ProfileErrors {
  name?: string;
  username?: string;
  displayName?: string;
  customStatus?: string;
  bio?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
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

/** DTO de canal retornado por Server-Roles-Core-Service */
export interface ChannelBackendResponse {
  id: string;
  name: string;
  type: ChannelType;
  server_id: string;
  category_id?: string | null;
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
  channels: ChannelBackendResponse[];
}

/** DTO de mensaje retornado por Chat-Engine-Service */
export interface MessageBackendPayload {
  id: string;
  content: string;
  authorId: string;
  channelId: string;
  createdAt: string;
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
  edited?: boolean;
  type?: MessageType;
  reactions?: Reaction[];
  attachments?: MessageAttachment[];
  embeds?: MessageEmbed[];
  mentions?: string[];
  replyToId?: string | null;
  replyTo?: Message | null;
  isPinned?: boolean;
  fileAttachment?: { name: string; size: string; type?: string };
  imageUrl?: string;
  hasMention?: boolean;
  isNew?: boolean;
}

/** Hilo o canal de conversación directa entre dos usuarios. */
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

/** Estado global de interfaz y navegación de la aplicación web. */
export interface AppState {
  currentUserId: string;
  activeServerId: string | null;
  activeChannelId: string | null;
  activeDirectMessageId: string | null;
  currentView: AppView;
  activeModal: Modal;
  confirmAction: ConfirmAction;
  confirmTarget?: unknown;
  searchQuery: string;
  isVoiceConnected: boolean;
  activeVoiceChannelId: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  userProfileModalId: string | null;
  authScreen?: AuthScreen;
  theme?: 'dark' | 'light';
}
