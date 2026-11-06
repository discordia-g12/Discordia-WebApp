import type { InboxEvent } from '../realtime/inboxSocket';
import type {
  Conversation,
  FriendRequest,
  FriendRequests,
  Message,
  MessageAttachment,
  MutualServer,
  PublicProfile,
  Server,
} from '../types';
import type { ConversationWith, StartConversationRequest, StartConversationResponse } from './conversations';
import type { SendFriendRequestPayload } from './friends';
import type { GetMessagesOptions } from './messages';
import type { PresenceMap } from './presence';
import type { CreateServerRequest } from './servers';
import type {
  TwoFactorActivateResponse,
  TwoFactorDisableResponse,
  TwoFactorRegenerateResponse,
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
  TwoFactorVerifyResponse,
} from './twoFactor';
import type { CreateProfileRequest, UserProfile } from './users';

/**
 * Respuestas simuladas para desarrollar sin backend. Las registra cada app (la web, con VITE_USE_MOCK en
 * desarrollo): core no conoce los datos de prueba ni las variables de entorno de cada plataforma.
 */
export interface ApiMock {
  getMyProfile(): Promise<UserProfile>;
  upsertMyProfile(payload: CreateProfileRequest): Promise<UserProfile>;
  getUsersBulk(userIds: string[]): Promise<UserProfile[]>;
  requestPasswordReset(email: string): Promise<void>;
  getServers?(): Promise<Server[]>;
  createServer?(payload: CreateServerRequest): Promise<Server>;
  getTwoFactorStatus?(): Promise<TwoFactorStatusResponse>;
  setupTwoFactor?(): Promise<TwoFactorSetupResponse>;
  activateTwoFactor?(code: string): Promise<TwoFactorActivateResponse>;
  verifyTwoFactor?(code: string): Promise<TwoFactorVerifyResponse>;
  disableTwoFactor?(password: string): Promise<TwoFactorDisableResponse>;
  regenerateRecoveryCodes?(): Promise<TwoFactorRegenerateResponse>;
  getPublicProfile?(userId: string): Promise<PublicProfile>;
  getMutualServers?(userId: string): Promise<MutualServer[]>;
  getFriends?(): Promise<PublicProfile[]>;
  removeFriend?(userId: string): Promise<void>;
  getFriendRequests?(): Promise<FriendRequests>;
  sendFriendRequest?(payload: SendFriendRequestPayload): Promise<FriendRequest | null>;
  acceptFriendRequest?(requestId: string): Promise<PublicProfile>;
  declineFriendRequest?(requestId: string): Promise<void>;
  cancelFriendRequest?(requestId: string): Promise<void>;
  getBlocks?(): Promise<PublicProfile[]>;
  blockUser?(userId: string): Promise<void>;
  unblockUser?(userId: string): Promise<void>;
  getConversations?(): Promise<Conversation[]>;
  getConversationWith?(userId: string): Promise<ConversationWith>;
  startConversation?(payload: StartConversationRequest): Promise<StartConversationResponse>;
  acceptConversation?(conversationId: string): Promise<Conversation>;
  declineConversation?(conversationId: string): Promise<void>;
  getPresence?(userIds: string[]): Promise<PresenceMap>;
  getMessages?(channelId: string, options?: GetMessagesOptions): Promise<Message[]>;
  sendMessage?(channelId: string, content: string, attachments?: MessageAttachment[]): Promise<Message>;
  markChannelRead?(channelId: string): Promise<void>;
  /** Reemplaza al socket inbox: el mock le entrega los eventos a `onEvent`. Devuelve cómo desuscribirse. */
  subscribeInbox?(onEvent: (event: InboxEvent) => void): () => void;
}

let apiMock: ApiMock | null = null;

export function setApiMock(mock: ApiMock | null): void {
  apiMock = mock;
}

export function getApiMock(): ApiMock | null {
  return apiMock;
}
