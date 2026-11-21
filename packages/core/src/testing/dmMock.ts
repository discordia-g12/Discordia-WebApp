import { ApiError } from '../api/errors';
import { isConversationId } from '../api/conversations';
import type { ApiMock } from '../api/mock';
import type { InboxEvent } from '../realtime/inboxSocket';
import type { Conversation, FriendRequest, Message, MessageAttachment, PublicProfile, Relationship } from '../types';
import { createCallMock, type CallMock, type CallMockOptions } from './callMock';
import { CURRENT_USER_ID, DM_MESSAGES, MESSAGES, SERVERS, USERS } from './data';
import { PINNED_LIMIT, sortPinnedMessages } from '../chat/pins';
import { MESSAGES_PAGE_SIZE } from '../hooks/messageCache';

export interface DmMockOptions extends CallMockOptions {
  /** Usuarios que bloquearon al usuario simulado: su relación es `none` y escribirles da error de entrega. */
  blockedBy?: string[];
}

export type DmMock = Required<
  Pick<
    ApiMock,
    | 'getPublicProfile'
    | 'getMutualServers'
    | 'getFriends'
    | 'removeFriend'
    | 'getFriendRequests'
    | 'sendFriendRequest'
    | 'acceptFriendRequest'
    | 'declineFriendRequest'
    | 'cancelFriendRequest'
    | 'getBlocks'
    | 'blockUser'
    | 'unblockUser'
    | 'getConversations'
    | 'getConversationWith'
    | 'startConversation'
    | 'acceptConversation'
    | 'declineConversation'
    | 'getPresence'
    | 'getMessages'
    | 'sendMessage'
    | 'setMessagePinned'
    | 'getPinnedMessages'
    | 'markChannelRead'
    | 'subscribeInbox'
  >
> &
  CallMock & {
  /** Simula un mensaje de `userId`, como si llegara por el socket inbox. */
  simulateIncomingMessage(userId: string, content: string): Message;
  /**
   * Agrega `count` mensajes viejos al comienzo de un canal o DM (el primero, el más viejo), para probar el
   * historial paginado. Devuelve los agregados.
   */
  seedOlderMessages(channelId: string, count: number): Message[];
};

interface PendingFriendRequest {
  id: string;
  userId: string;
  direction: 'incoming' | 'outgoing';
  message: string | null;
  createdAt: string;
}

const seedConversation = (
  otherUserId: string,
  status: Conversation['status'],
  requestedBy: string,
  content: string,
  createdAt: string,
  unreadCount = 0
): Conversation => ({
  id: `dm-${otherUserId}`,
  status,
  requestedBy,
  otherUserId,
  lastMessage: { content, authorId: requestedBy, createdAt },
  unreadCount,
});

const notFound = (detail: string) => new ApiError({ status: 404, detail });
const forbidden = (code: string) => new ApiError({ status: 403, code, detail: code });

/**
 * Los DMs simulados, con las reglas de producto y un caso de cada cosa. u1 y u2: amigos, con chat.
 * u3: solicitud de mensaje recibida. u4: solicitud de mensaje y de amistad enviadas. u5: solicitud de
 * amistad recibida. u6: bloqueado. El estado vive en cada instancia y se pierde al recargar.
 */
export function createDmMock({ blockedBy = [], ...callOptions }: DmMockOptions = {}): DmMock {
  const friends = new Set(['u1', 'u2']);
  const blocked = new Set(['u6']);
  const blockers = new Set(blockedBy);
  const listeners = new Set<(event: InboxEvent) => void>();
  let sequence = 0;

  let requests: PendingFriendRequest[] = [
    {
      id: 'fr-u5',
      userId: 'u5',
      direction: 'incoming',
      message: 'Te vi en el server de la materia, ¿sumamos?',
      createdAt: '2026-09-09T11:00:00.000Z',
    },
    { id: 'fr-u4', userId: 'u4', direction: 'outgoing', message: null, createdAt: '2026-09-08T09:00:00.000Z' },
  ];

  const conversations = new Map<string, Conversation>(
    [
      seedConversation('u1', 'accepted', 'u1', 'Perfecto Alex, revisamos la auditoría en la reunión.', '2026-09-09T10:15:00.000Z', 1),
      seedConversation('u2', 'accepted', 'u2', 'Subí el fix del Null Byte sanitizer en Python.', '2026-09-08T22:30:00.000Z'),
      seedConversation('u3', 'pending', 'u3', '¿Pudiste ver la nueva paleta de colores?', '2026-09-08T19:40:00.000Z', 1),
      seedConversation('u4', 'pending', CURRENT_USER_ID, 'Hola Lucas, ¿te sumás al TP?', '2026-09-08T09:00:00.000Z'),
      seedConversation('u6', 'accepted', 'u6', 'Nos vemos.', '2026-09-01T09:00:00.000Z'),
    ].map((c) => [c.id, c])
  );

  const message = (channelId: string, authorId: string, content: string, attachments?: MessageAttachment[]): Message => {
    sequence += 1;
    const timestamp = new Date().toISOString();
    return {
      id: `dm-msg-${Date.now()}-${sequence}`,
      channelId,
      authorId,
      content,
      timestamp,
      createdAt: timestamp,
      type: 'normal',
      ...(attachments?.length ? { attachments } : {}),
    };
  };

  const history = new Map<string, Message[]>(
    Array.from(conversations.values()).map((c) => {
      const seeded = DM_MESSAGES[c.id] ?? [];
      const { content, authorId, createdAt } = c.lastMessage!;
      return [
        c.id,
        seeded.length
          ? seeded.map((m) => ({ ...m, createdAt: m.timestamp }))
          : [{ id: `${c.id}-msg-1`, channelId: c.id, authorId, content, timestamp: createdAt, createdAt, type: 'normal' }],
      ];
    })
  );

  const emit = (event: InboxEvent) => listeners.forEach((listener) => listener(event));

  // Canales de servidor: arrancan con MESSAGES y se les pueden sembrar mensajes viejos
  const channelHistory = new Map<string, Message[]>();
  const historyOf = (channelId: string): Message[] =>
    isConversationId(channelId)
      ? (history.get(channelId) ?? [])
      : (channelHistory.get(channelId) ?? MESSAGES[channelId] ?? []);
  const setHistory = (channelId: string, list: Message[]) =>
    (isConversationId(channelId) ? history : channelHistory).set(channelId, list);

  // Fijados por id de mensaje, como el flag de Chat-Engine
  const pins = new Map<string, { pinnedAt: string; pinnedBy: string }>();
  const withPin = (m: Message): Message => {
    const pin = pins.get(m.id);
    return { ...m, isPinned: Boolean(pin), pinnedAt: pin?.pinnedAt ?? null, pinnedBy: pin?.pinnedBy ?? null };
  };

  const relationshipWith = (userId: string): Relationship => {
    if (blocked.has(userId)) return 'blocked';
    if (friends.has(userId)) return 'friend';
    const request = requests.find((r) => r.userId === userId);
    if (!request) return 'none';
    return request.direction === 'outgoing' ? 'request_sent' : 'request_received';
  };

  const profile = (userId: string): PublicProfile => {
    const user = USERS[userId];
    if (!user) throw notFound('Mock user not found');
    const request = requests.find((r) => r.userId === userId);
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatar ?? null,
      bio: user.bio ?? null,
      customStatus: user.customStatus ?? null,
      createdAt: user.createdAt ?? '2022-01-01T00:00:00.000Z',
      relationship: relationshipWith(userId),
      ...(request ? { friendRequestId: request.id } : {}),
    };
  };

  const toFriendRequest = ({ id, userId, message: text, createdAt }: PendingFriendRequest): FriendRequest => ({
    id,
    user: profile(userId),
    message: text,
    createdAt,
  });

  const removeRequest = (id: string) => {
    const request = requests.find((r) => r.id === id);
    if (!request) throw notFound('Mock friend request not found');
    requests = requests.filter((r) => r.id !== id);
    return request;
  };

  /** Al quedar amigos, la conversación pendiente o rechazada pasa a `accepted`. */
  const acceptConversationWith = (userId: string) => {
    const conversation = conversations.get(`dm-${userId}`);
    if (conversation) conversation.status = 'accepted';
  };

  const canReach = (userId: string) => !blocked.has(userId) && !blockers.has(userId);

  const conversationFor = (id: string) => {
    const conversation = conversations.get(id);
    if (!conversation) throw notFound('Mock conversation not found');
    return conversation;
  };

  const deliver = (conversation: Conversation, sent: Message) => {
    history.set(conversation.id, [...(history.get(conversation.id) ?? []), sent]);
    conversation.lastMessage = { content: sent.content, authorId: sent.authorId, createdAt: sent.timestamp };
    if (sent.authorId === conversation.otherUserId) conversation.unreadCount += 1;
    emit({
      type: 'DM_MESSAGE',
      conversationId: conversation.id,
      message: { ...sent, createdAt: sent.timestamp },
    });
  };

  /** Mismas reglas que call-access de Chat: conversación aceptada (o amigos), sin bloqueo en ningún sentido. */
  const callAccess = (conversationId: string) => {
    const conversation = conversations.get(conversationId);
    if (!conversation) throw new ApiError({ status: 404, code: 'CONVERSATION_NOT_FOUND', detail: 'Mock conversation not found' });
    const { otherUserId } = conversation;
    if (!canReach(otherUserId)) throw forbidden('DM_NOT_DELIVERABLE');
    if (conversation.status !== 'accepted' && !friends.has(otherUserId)) throw forbidden('DM_PENDING');
    return otherUserId;
  };

  return {
    ...createCallMock({ emit, callAccess }, callOptions),

    async getPublicProfile(userId) {
      if (USERS[userId]?.isSuspended) throw notFound('Mock profile not available');
      return profile(userId);
    },

    async getMutualServers(userId) {
      return SERVERS.filter(
        (s) => s.members.some((m) => m.id === userId) && s.members.some((m) => m.id === CURRENT_USER_ID)
      ).map(({ id, name, iconUrl }) => ({ id, name, ...(iconUrl ? { iconUrl } : {}) }));
    },

    async getFriends() {
      return Array.from(friends).map(profile);
    },

    async removeFriend(userId) {
      friends.delete(userId);
    },

    async getFriendRequests() {
      const byDirection = (direction: PendingFriendRequest['direction']) =>
        requests.filter((r) => r.direction === direction).map(toFriendRequest);
      return { incoming: byDirection('incoming'), outgoing: byDirection('outgoing') };
    },

    async sendFriendRequest({ target, userId, message: text }) {
      // Por email nunca se confirma si existe
      if (target?.includes('@')) return null;

      const user = userId ? USERS[userId] : Object.values(USERS).find((u) => u.username === target);
      if (!user) throw notFound('Mock user not found');
      if (user.id === CURRENT_USER_ID) throw new ApiError({ status: 422, detail: 'Mock request to self' });
      if (!canReach(user.id)) return null;
      if (friends.has(user.id)) throw new ApiError({ status: 409, detail: 'Mock already friends' });

      const existing = requests.find((r) => r.userId === user.id);
      if (existing?.direction === 'outgoing') throw new ApiError({ status: 409, detail: 'Mock already pending' });
      if (existing) {
        // Solicitud inversa pendiente: se aceptan las dos
        removeRequest(existing.id);
        friends.add(user.id);
        acceptConversationWith(user.id);
        return toFriendRequest(existing);
      }

      sequence += 1;
      const request: PendingFriendRequest = {
        id: `fr-${user.id}-${sequence}`,
        userId: user.id,
        direction: 'outgoing',
        message: text ?? null,
        createdAt: new Date().toISOString(),
      };
      requests.push(request);
      return toFriendRequest(request);
    },

    async acceptFriendRequest(requestId) {
      const { userId } = removeRequest(requestId);
      friends.add(userId);
      acceptConversationWith(userId);
      return profile(userId);
    },

    async declineFriendRequest(requestId) {
      removeRequest(requestId);
    },

    async cancelFriendRequest(requestId) {
      removeRequest(requestId);
    },

    async getBlocks() {
      return Array.from(blocked).map(profile);
    },

    async blockUser(userId) {
      blocked.add(userId);
      friends.delete(userId);
      requests = requests.filter((r) => r.userId !== userId);
    },

    async unblockUser(userId) {
      blocked.delete(userId);
    },

    async getConversations() {
      return Array.from(conversations.values())
        .filter((c) => c.status !== 'declined' || c.requestedBy === CURRENT_USER_ID)
        .map((c) => ({ ...c }))
        .sort((a, b) => (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''));
    },

    async getConversationWith(userId) {
      if (friends.has(userId)) acceptConversationWith(userId);
      const conversation = conversations.get(`dm-${userId}`);
      return { conversation: conversation ? { ...conversation } : null, canMessage: canReach(userId) };
    },

    async startConversation({ recipientId, content, attachments }) {
      if (!USERS[recipientId] || !canReach(recipientId)) throw forbidden('DM_NOT_DELIVERABLE');

      const id = `dm-${recipientId}`;
      let conversation = conversations.get(id);
      if (conversation && conversation.status !== 'accepted') throw forbidden('DM_PENDING');
      if (!conversation) {
        conversation = {
          id,
          status: friends.has(recipientId) ? 'accepted' : 'pending',
          requestedBy: CURRENT_USER_ID,
          otherUserId: recipientId,
          unreadCount: 0,
        };
        conversations.set(id, conversation);
      }

      const sent = message(id, CURRENT_USER_ID, content, attachments);
      deliver(conversation, sent);
      return { conversation: { ...conversation }, message: sent };
    },

    async acceptConversation(conversationId) {
      const conversation = conversationFor(conversationId);
      if (conversation.requestedBy === CURRENT_USER_ID) throw forbidden('DM_PENDING');
      conversation.status = 'accepted';
      return { ...conversation };
    },

    async declineConversation(conversationId) {
      const conversation = conversationFor(conversationId);
      if (conversation.requestedBy === CURRENT_USER_ID) throw forbidden('DM_PENDING');
      conversation.status = 'declined';
    },

    async getPresence(userIds) {
      return Object.fromEntries(
        userIds.map((id) => [id, USERS[id] && USERS[id].status !== 'offline' ? 'online' : 'offline'])
      );
    },

    async getMessages(channelId, { before, limit = MESSAGES_PAGE_SIZE } = {}) {
      // Paginado como Chat-Engine: los `limit` anteriores a `before`, en orden cronológico
      const list = historyOf(channelId);
      const end = before ? list.findIndex((m) => m.id === before) : list.length;
      if (end === -1) return [];
      return list.slice(Math.max(0, end - limit), end).map(withPin);
    },

    async setMessagePinned(channelId, messageId, pinned) {
      const found = historyOf(channelId).find((m) => m.id === messageId);
      if (!found || found.type === 'deleted') throw notFound('Message not found');
      if (pinned && !pins.has(messageId)) {
        const count = historyOf(channelId).filter((m) => pins.has(m.id)).length;
        if (count >= PINNED_LIMIT) throw new ApiError({ status: 409, detail: 'Pinned messages limit reached' });
        pins.set(messageId, { pinnedAt: new Date().toISOString(), pinnedBy: CURRENT_USER_ID });
      } else if (!pinned) {
        pins.delete(messageId);
      }
      return withPin(found);
    },

    async getPinnedMessages(channelId) {
      return sortPinnedMessages(historyOf(channelId).filter((m) => pins.has(m.id)).map(withPin));
    },

    async sendMessage(channelId, content, attachments) {
      const sent = message(channelId, CURRENT_USER_ID, content, attachments);
      if (!isConversationId(channelId)) return sent;

      const conversation = conversationFor(channelId);
      if (conversation.status !== 'accepted') throw forbidden('DM_PENDING');
      if (!canReach(conversation.otherUserId)) throw forbidden('DM_NOT_DELIVERABLE');
      deliver(conversation, sent);
      return sent;
    },

    async markChannelRead(channelId) {
      const conversation = conversations.get(channelId);
      if (conversation) conversation.unreadCount = 0;
    },

    subscribeInbox(onEvent) {
      listeners.add(onEvent);
      return () => listeners.delete(onEvent);
    },

    seedOlderMessages(channelId, count) {
      const current = historyOf(channelId);
      const first = current[0] ? new Date(current[0].timestamp).getTime() : Date.now();
      const authors = isConversationId(channelId)
        ? [CURRENT_USER_ID, conversationFor(channelId).otherUserId]
        : [CURRENT_USER_ID, 'u1', 'u2'];
      const seeded = Array.from({ length: count }, (_, i): Message => {
        const timestamp = new Date(first - (count - i) * 60_000).toISOString();
        return {
          id: `${channelId}-old-${i + 1}`,
          channelId,
          authorId: authors[i % authors.length],
          content: `mensaje viejo ${i + 1}`,
          timestamp,
          createdAt: timestamp,
          type: 'normal',
        };
      });
      setHistory(channelId, [...seeded, ...current]);
      return seeded;
    },

    simulateIncomingMessage(userId, content) {
      const conversation = conversationFor(`dm-${userId}`);
      const received = message(conversation.id, userId, content);
      deliver(conversation, received);
      return received;
    },
  };
}
