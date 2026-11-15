import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/session';
import {
  acceptConversation,
  declineConversation,
  getConversations,
  getConversationWith,
  startConversation,
  type StartConversationRequest,
} from '../api/conversations';
import { getPresence } from '../api/presence';
import type { Conversation } from '../types';
import {
  applyConversationMessage,
  conversationsQueryKey,
  conversationWithQueryKey,
  removeConversation,
  upsertConversation,
} from './inboxCache';

/** Cada cuánto se pide la presencia. Menos que los 60 s que dura en Chat-Engine. */
export const PRESENCE_POLL_MS = 30_000;

/** Cada cuánto se revisa un chat al que no se puede escribir: a quien desbloquean nadie le avisa. */
export const UNDELIVERABLE_POLL_MS = 30_000;

export function presenceQueryKey(userIds: string[]) {
  return ['presence', userIds] as const;
}

export function useConversationsQuery() {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: getConversations,
    enabled: status === 'authenticated',
  });
}

/**
 * La conversación con un usuario y si se le puede escribir. Se usa al abrir un chat: no crea nada, y si ya
 * son amigos deja la conversación en `accepted`.
 */
export function useConversationWithQuery(userId: string | null) {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: conversationWithQueryKey(userId),
    queryFn: () => getConversationWith(userId as string),
    enabled: status === 'authenticated' && Boolean(userId),
    refetchInterval: (query) => (query.state.data?.canMessage === false ? UNDELIVERABLE_POLL_MS : false),
    refetchOnWindowFocus: true,
  });
}

/** Manda el primer mensaje a un usuario. Resuelve en `{ conversation, message }`: abrir `conversation.id`. */
export function useStartConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartConversationRequest) => startConversation(payload),
    onSuccess: ({ conversation, message }, { recipientId }) => {
      queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (old) =>
        applyConversationMessage(upsertConversation(old, conversation), conversation.id, message, conversation.id)
      );
      queryClient.invalidateQueries({ queryKey: conversationWithQueryKey(recipientId) });
    },
  });
}

/** Acepta una solicitud de mensaje. No los hace amigos. */
export function useAcceptConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => acceptConversation(conversationId),
    onSuccess: (conversation) => {
      queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (old) => upsertConversation(old, conversation));
      queryClient.invalidateQueries({ queryKey: conversationWithQueryKey(conversation.otherUserId) });
    },
  });
}

/** Rechaza una solicitud de mensaje: sale de la lista de quien la rechazó. */
export function useDeclineConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => declineConversation(conversationId),
    onSuccess: (_data, conversationId) => {
      queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (old) => removeConversation(old, conversationId));
    },
  });
}

/** Presencia de los usuarios indicados. Mientras carga un conjunto nuevo de ids, se ve el anterior. */
export function usePresenceQuery(userIds: string[]) {
  const status = useSession((s) => s.status);
  const idsKey = Array.from(new Set(userIds.filter(Boolean))).sort().join(',');
  const ids = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);

  return useQuery({
    queryKey: presenceQueryKey(ids),
    queryFn: () => getPresence(ids),
    enabled: status === 'authenticated' && ids.length > 0,
    refetchInterval: PRESENCE_POLL_MS,
    placeholderData: (previous) => previous,
  });
}
