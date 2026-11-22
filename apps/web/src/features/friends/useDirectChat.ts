import { useQueryClient } from '@tanstack/react-query';
import {
  appendMessage,
  applyConversationMessage,
  conversationsQueryKey,
  dmActions,
  dmErrorCode,
  dmSendErrorMessage,
  isProfileUnavailable,
  messagesQueryKey,
  sendMessage,
  useAcceptConversationMutation,
  useChannelMessagesQuery,
  useConversationsQuery,
  useConversationWithQuery,
  usePresenceQuery,
  usePublicProfileQuery,
  useStartConversationMutation,
  type Conversation,
  type MessagePages,
} from '@discordia/core';
import type { MessageAttachment } from '../../types';
import { showToast } from '../../app/uiStore';
import { useUsers } from '../../app/usersContext';
import { profileToUser } from './profileUser';

/**
 * Datos y envío del chat con un usuario. `userId` es el id con el que se abrió, que puede ser un alias: la
 * conversación se busca por lo que devuelve Chat-Engine. Sin conversación todavía, el primer mensaje la crea.
 */
export function useDirectChat(userId: string) {
  const queryClient = useQueryClient();
  const { userOrFallback } = useUsers();
  const profileQuery = usePublicProfileQuery(userId);
  const conversationWith = useConversationWithQuery(userId);
  const { data: conversations } = useConversationsQuery();
  const start = useStartConversationMutation();
  const accept = useAcceptConversationMutation();

  const opened = conversationWith.data?.conversation ?? null;
  const conversation = conversations?.find((c) => c.id === opened?.id || c.otherUserId === userId) ?? opened;
  const conversationId = conversation?.id ?? null;
  const messages = useChannelMessagesQuery(conversationId);

  const profile = profileQuery.data;
  const actions = dmActions({
    relationship: profile?.relationship ?? 'none',
    conversation,
    canMessage: conversationWith.data?.canMessage,
  });

  const deliver = async (content: string, attachment?: MessageAttachment) => {
    if (!conversation) {
      await start.mutateAsync({ recipientId: userId, content });
      return;
    }
    // Quien rechazó y escribe se arrepintió (§2)
    if (conversation.status === 'declined') await accept.mutateAsync(conversation.id);
    const sent = await sendMessage(conversation.id, content, undefined, attachment ? [attachment] : undefined);
    // El inbox también lo trae, pero puede estar cortado. Ninguno de los dos lo repite
    queryClient.setQueryData<MessagePages>(messagesQueryKey(conversation.id), (old) => appendMessage(old, sent));
    queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (old) =>
      applyConversationMessage(old, conversation.id, sent, conversation.id)
    );
  };

  const send = async (content: string, attachment?: MessageAttachment) => {
    try {
      await deliver(content, attachment);
    } catch (err) {
      if (dmErrorCode(err)) {
        // El estado cambió (bloqueo o solicitud sin aceptar): el composer tiene que enterarse
        queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
        showToast(dmSendErrorMessage(err), 'danger');
      } else {
        showToast(dmSendErrorMessage(err), 'danger', { label: 'reintentar', onPress: () => send(content, attachment) });
      }
    }
  };

  const { data: presence } = usePresenceQuery([userId]);

  return {
    profile,
    /** Con quién es el chat, aunque su perfil no esté disponible (cuenta suspendida). */
    user: profile ? profileToUser(profile, presence) : { ...userOrFallback(userId), status: 'offline' as const },
    conversation,
    actions,
    messages,
    send,
    isLoading: profileQuery.isLoading || conversationWith.isLoading,
    isError: (profileQuery.isError && !isProfileUnavailable(profileQuery.error)) || conversationWith.isError,
    retry: () => {
      profileQuery.refetch();
      conversationWith.refetch();
    },
  };
}
