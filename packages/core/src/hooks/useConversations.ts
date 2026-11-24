import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/session';
import {
  acceptConversation,
  declineConversation,
  getConversations,
  getConversationWith,
  startConversation,
  type StartConversationRequest,
} from '../api/conversations';
import { getPresence, type PresenceMap, type PresenceStatus } from '../api/presence';
import { watchPresence } from '../realtime/presenceSync';
import type { Conversation } from '../types';
import { dmActions, dmThreadWriteBlock } from '../dm/actions';
import { usePublicProfileQuery } from './useFriends';
import {
  applyConversationMessage,
  conversationsQueryKey,
  conversationWithQueryKey,
  removeConversation,
  upsertConversation,
} from './inboxCache';

/**
 * Cada cuánto se pide la presencia. Los cambios llegan al instante por el inbox (PRESENCE_UPDATE): esto cubre
 * lo que no avisa nadie (una instancia de Chat-Engine que se cae) y el inbox cortado.
 */
export const PRESENCE_POLL_MS = 60_000;

/** Cada cuánto se revisa un chat al que no se puede escribir: a quien desbloquean nadie le avisa. */
export const UNDELIVERABLE_POLL_MS = 30_000;

export function presenceQueryKey(userIds: string[]) {
  return ['presence', userIds] as const;
}

/**
 * Aplica estados que llegaron por el inbox a las consultas de presencia ya cargadas que incluyen a esos
 * usuarios. No crea consultas: un usuario que nadie muestra no se guarda.
 */
export function applyPresence(queryClient: QueryClient, statuses: Record<string, PresenceStatus>) {
  const ids = Object.keys(statuses);
  if (ids.length === 0) return;
  queryClient.setQueriesData<PresenceMap>(
    // ['presence', 'me'] es el estado propio: un string, no un mapa
    { predicate: ({ queryKey: [scope, userIds] }) => scope === 'presence' && Array.isArray(userIds) },
    (old) => {
      if (!old || !ids.some((id) => id in old && old[id] !== statuses[id])) return old;
      const next = { ...old };
      for (const id of ids) if (id in next) next[id] = statuses[id];
      return next;
    }
  );
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

/**
 * Presencia de los usuarios indicados. Mientras carga un conjunto nuevo de ids, se ve el anterior. Mientras
 * está montado, el inbox sigue a esos ids y aplica sus cambios al instante (applyPresence).
 */
export function usePresenceQuery(userIds: string[]) {
  const status = useSession((s) => s.status);
  const idsKey = Array.from(new Set(userIds.filter(Boolean))).sort().join(',');
  const ids = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);

  useEffect(() => watchPresence(ids), [ids]);

  return useQuery({
    queryKey: presenceQueryKey(ids),
    queryFn: () => getPresence(ids),
    enabled: status === 'authenticated' && ids.length > 0,
    refetchInterval: PRESENCE_POLL_MS,
    placeholderData: (previous) => previous,
  });
}

/**
 * Qué impide responder en el hilo de un DM (bloqueo, solicitud sin aceptar, sin entrega), o null. Sale de la
 * conversación en la lista; si todavía no está, no bloquea y Chat-Engine valida igual al enviar.
 */
export function useDmThreadWriteBlock(conversationId: string | null): string | null {
  const { data: conversations } = useConversationsQuery();
  const conversation = conversations?.find((c) => c.id === conversationId) ?? null;
  const otherUserId = conversation?.otherUserId ?? null;
  const profile = usePublicProfileQuery(otherUserId);
  const withQuery = useConversationWithQuery(otherUserId);
  if (!conversation) return null;
  return dmThreadWriteBlock(
    dmActions({ relationship: profile.data?.relationship ?? 'none', conversation, canMessage: withQuery.data?.canMessage })
  );
}
