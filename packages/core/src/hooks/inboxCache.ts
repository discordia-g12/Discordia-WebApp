import type { Conversation, Message } from '../types';

/** Caché de GET /conversations. Las claves con este prefijo se invalidan junto con la lista. */
export const conversationsQueryKey = ['conversations'] as const;

export function conversationWithQueryKey(userId: string | null) {
  return ['conversations', 'with', userId] as const;
}

const lastActivity = (conversation: Conversation) => Date.parse(conversation.lastMessage?.createdAt ?? '') || 0;

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => lastActivity(b) - lastActivity(a));
}

/** Agrega o reemplaza una conversación. Si la lista todavía no cargó, no se toca: va a traerla el pedido. */
export function upsertConversation(
  conversations: Conversation[] | undefined,
  conversation: Conversation
): Conversation[] | undefined {
  if (!conversations) return conversations;
  return sortConversations([...conversations.filter((c) => c.id !== conversation.id), conversation]);
}

export function removeConversation(
  conversations: Conversation[] | undefined,
  conversationId: string
): Conversation[] | undefined {
  return conversations?.filter((c) => c.id !== conversationId);
}

/**
 * Aplica un mensaje a la conversación: actualiza la vista previa, la sube en la lista y suma un no leído si
 * lo mandó el otro y no es la conversación abierta (`activeConversationId`).
 */
export function applyConversationMessage(
  conversations: Conversation[] | undefined,
  conversationId: string,
  message: Message,
  activeConversationId?: string | null
): Conversation[] | undefined {
  if (!conversations) return conversations;
  return sortConversations(
    conversations.map((c) => {
      if (c.id !== conversationId) return c;
      const unread = message.authorId === c.otherUserId && c.id !== activeConversationId;
      return {
        ...c,
        lastMessage: {
          content: message.content,
          authorId: message.authorId,
          createdAt: message.createdAt ?? message.timestamp,
        },
        unreadCount: unread ? c.unreadCount + 1 : c.unreadCount,
      };
    })
  );
}
