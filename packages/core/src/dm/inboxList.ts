import type { Conversation, FriendRequest } from '../types';

/**
 * Lo que aparece en la lista de chats. `conversation`: chat común. `waiting_reply`: solicitud de mensaje
 * que mandó el usuario. `message_request`: solicitud de mensaje que recibió. `friend_request`: solicitud de
 * amistad que recibió.
 */
export type DmListItem = {
  /** Único en la lista: sirve de key. */
  key: string;
  /** La otra persona. */
  userId: string;
  /** Fecha de lo último que pasó: ordena la lista. Vacía si la conversación no tiene mensajes. */
  lastActivityAt: string;
} & (
  | { kind: 'conversation' | 'waiting_reply' | 'message_request'; conversation: Conversation }
  | { kind: 'friend_request'; friendRequest: FriendRequest }
);

/** true si el usuario autenticado inició la conversación. Sirve también si su id es un alias. */
export function isConversationRequester(conversation: Conversation): boolean {
  return conversation.requestedBy !== conversation.otherUserId;
}

/**
 * pending o declined que inició el usuario: siempre "esperando respuesta", porque a quien la inició no se
 * le avisa del rechazo.
 */
export function isWaitingForReply(conversation: Conversation): boolean {
  return conversation.status !== 'accepted' && isConversationRequester(conversation);
}

/** Solicitud de mensaje recibida y sin responder. */
export function isMessageRequest(conversation: Conversation): boolean {
  return conversation.status === 'pending' && !isConversationRequester(conversation);
}

function conversationItem(conversation: Conversation): DmListItem | null {
  let kind: 'conversation' | 'waiting_reply' | 'message_request' = 'conversation';
  if (isWaitingForReply(conversation)) kind = 'waiting_reply';
  else if (isMessageRequest(conversation)) kind = 'message_request';
  // La rechazó el usuario: un evento del socket puede traerla aunque GET /conversations ya no la devuelva
  else if (conversation.status === 'declined') return null;

  return {
    kind,
    key: conversation.id,
    userId: conversation.otherUserId,
    lastActivityAt: conversation.lastMessage?.createdAt ?? '',
    conversation,
  };
}

/**
 * Arma la lista "como un chat más": conversaciones, solicitudes de mensaje y solicitudes de amistad
 * recibidas, de lo más reciente a lo más viejo. Las solicitudes enviadas no van: se ven en Pendiente.
 */
export function buildDmList(
  conversations: Conversation[] | undefined,
  incomingFriendRequests: FriendRequest[] | undefined
): DmListItem[] {
  const items: DmListItem[] = [];
  for (const conversation of conversations ?? []) {
    const item = conversationItem(conversation);
    if (item) items.push(item);
  }
  for (const friendRequest of incomingFriendRequests ?? []) {
    items.push({
      kind: 'friend_request',
      key: `friend-request-${friendRequest.id}`,
      userId: friendRequest.user.id,
      lastActivityAt: friendRequest.createdAt,
      friendRequest,
    });
  }
  return items.sort(
    (a, b) => (Date.parse(b.lastActivityAt) || 0) - (Date.parse(a.lastActivityAt) || 0) || a.key.localeCompare(b.key)
  );
}
