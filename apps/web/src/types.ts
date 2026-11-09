/**
 * Tipos de interfaz del cliente web (vistas, modales, confirmaciones). Los tipos de dominio vienen de
 * @discordia/core y se re-exportan acá para que los componentes los importen de un solo lugar.
 */

export type {
  AuditEntry,
  Category,
  CategoryBackendResponse,
  Channel,
  ChannelBackendResponse,
  ChannelType,
  Message,
  MessageAttachment,
  MessageBackendPayload,
  MessageEmbed,
  MessageType,
  Notification,
  Reaction,
  Role,
  RoleBackendResponse,
  RoleMember,
  RoleMemberBackendResponse,
  Server,
  ServerBackendResponse,
  ServerBan,
  ServerBanBackendResponse,
  ServerMember,
  ServerMemberBackendResponse,
  ServerMemberPage,
  ServerMemberPageBackendResponse,
  Status,
  User,
} from '@discordia/core';

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
  | 'confirm-action'
  | 'search'
  | 'edit-message'
  | 'create-channel'
  | 'edit-channel'
  | 'create-category'
  | null;

/** Acciones críticas que requieren confirmación explícita del usuario. */
export type ConfirmAction =
  | 'ban-member'
  | 'kick-member'
  | 'delete-channel'
  | 'delete-server'
  | 'leave-server'
  | 'transfer-ownership'
  | 'switch-voice-channel'
  | 'delete-category'
  | 'logout'
  | 'block-user'
  | 'remove-friend'
  | 'delete-message'
  // Backoffice (apps/backoffice usa el mismo ConfirmDialog)
  | 'suspend-user'
  | 'reactivate-user'
  | null;

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
