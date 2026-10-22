// Tipos de dominio y DTO del backend: los mismos que la web, desde @discordia/core.
// Los de abajo son los modelos de la interfaz mobile (se unifican con los de la web en el paso 13).
import type { ChannelType, MessageType, Status } from '@discordia/core'

export type {
  ChannelBackendResponse,
  ChannelType,
  MessageBackendPayload,
  MessageType,
  RoleBackendResponse,
  RoleMember,
  RoleMemberBackendResponse,
  ServerBackendResponse,
  ServerMember,
  ServerMemberBackendResponse,
  ServerMemberPage,
  ServerMemberPageBackendResponse,
  Status,
} from '@discordia/core'

export type AuthScreen = 'login' | 'register' | 'forgot' | '2fa' | 'verify-email'
export type AppView =
  | 'chat'
  | 'voice'
  | 'home'
  | 'server-settings'
  | 'user-settings'
  | 'own-profile'
  | 'server-boost'
  | 'premium'
  | 'notifications'
export type Modal =
  | 'create-server'
  | 'join-server'
  | 'user-profile'
  | 'invite'
  | 'incoming-call'
  | 'confirm-action'
  | 'search'
  | 'edit-message'
  | null

export type ConfirmAction =
  | 'ban-member'
  | 'kick-member'
  | 'delete-channel'
  | 'delete-server'
  | 'leave-server'
  | 'transfer-ownership'
  | null

export interface User {
  id: string
  name: string
  username: string
  avatar: string | null
  avatarPreview?: string | null
  color: string
  status: Status
  customStatus?: string
  bio?: string
  joinedAt: string
  roles?: string[]
  isPremium?: boolean
  isBoosting?: boolean
  suspended?: boolean
  bannerColor?: string
}

export interface ProfileErrors {
  name?: string
  bio?: string
  customStatus?: string
}

export interface Role {
  id: string
  name: string
  color: string
  memberCount: number
  position: number
  permissions: Record<string, boolean>
}

/** Rol de un servidor tal como lo devuelve el backend, en el modelo de dominio del cliente. */
export interface ServerRole {
  id: string
  name: string
  color: string | null
  position: number
  permissionsBitmask: number
  isDefault: boolean
}

export interface Channel {
  id: string
  name: string
  type: ChannelType
  serverId?: string
  topic?: string
  categoryId?: string | null
  unread?: number
  mentions?: number
  participants?: string[]
  position?: number
}

export interface Category {
  id: string
  name: string
  channels: Channel[]
  collapsed?: boolean
}

export interface Server {
  id: string
  name: string
  ownerId: string
  icon: string | null
  iconUrl?: string | null
  color: string
  description?: string
  channels?: Channel[]
  categories: Category[]
  roles: Role[]
  members: string[]
  memberCount: number
  boostLevel: number
  boostCount: number
  unread?: boolean
  mentions?: number
  muted?: boolean
  createdAt?: string
}

export interface Reaction {
  emoji: string
  count: number
  reacted: boolean
}

export type MessageStatus = 'pending' | 'sent' | 'failed'

export interface Message {
  id: string
  content: string
  channelId: string
  userId: string
  timestamp: string
  authorId?: string
  createdAt?: string
  edited?: boolean
  type?: MessageType
  status?: MessageStatus
  reactions?: Reaction[]
  imageUrl?: string
  fileAttachment?: { name: string; size: string; type: string }
  replyTo?: string
  hasMention?: boolean
  isNew?: boolean
}

export interface DirectMessage {
  id: string
  userId: string
  lastMessage: string
  lastTimestamp: string
  unread?: number
  pinned?: boolean
}

export interface Notification {
  id: string
  type: 'mention' | 'dm' | 'reply' | 'reaction'
  userId: string
  channelId?: string
  serverId?: string
  serverName?: string
  channelName?: string
  preview: string
  timestamp: string
  read: boolean
}

export interface AuditEntry {
  id: string
  actorId: string
  action: string
  target: string
  timestamp: string
  details?: string
}

export interface AppState {
  view: 'auth' | 'app'
  authScreen: AuthScreen
  selectedServerId: string
  selectedChannelId: string
  appView: AppView
  memberListOpen: boolean
  activeModal: Modal
  profileUserId: string | null
  inVoiceChannelId: string | null
  micMuted: boolean
  deafened: boolean
  cameraOn: boolean
  screenSharing: boolean
  notifOpen: boolean
  searchOpen: boolean
  searchQuery: string
  messages: Record<string, Message[]>
  contextMenu: { x: number; y: number; messageId?: string; userId?: string } | null
  confirmAction: ConfirmAction
  confirmTarget?: string
  settingsTab: string
  serverSettingsTab: string
  categoryCollapsed: Record<string, boolean>
  reactedMessages: Record<string, string[]>
  toast: { message: string; type: 'success' | 'error' | 'info' } | null
  editingMessageId: string | null
  replyToMessageId: string | null
}
