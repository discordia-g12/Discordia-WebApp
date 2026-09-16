export type Status = 'online' | 'idle' | 'dnd' | 'offline' | 'invisible'
export type ChannelType = 'text' | 'voice' | 'announcement'
export type MessageType = 'normal' | 'system' | 'deleted'
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

export interface Channel {
  id: string
  name: string
  type: ChannelType
  topic?: string
  unread?: number
  mentions?: number
  participants?: string[]
  position: number
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
  icon: string | null
  color: string
  ownerId: string
  description?: string
  memberCount: number
  boostLevel: number
  boostCount: number
  categories: Category[]
  roles: Role[]
  members: string[]
  unread?: boolean
  mentions?: number
  muted?: boolean
}

export interface Reaction {
  emoji: string
  count: number
  reacted: boolean
}

export interface Message {
  id: string
  channelId: string
  userId: string
  content: string
  timestamp: string
  edited?: boolean
  type: MessageType
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
