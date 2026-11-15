import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/session';
import { isConversationId } from '../api/conversations';
import { getUnread, markAllRead, markChannelRead, type ChannelUnread } from '../api/readStates';
import type { Channel, Conversation, Server } from '../types';
import { conversationsQueryKey } from './inboxCache';

/** Cada cuánto se vuelven a pedir los no leídos. El chat abierto no depende de esto (lo marca al momento). */
export const UNREAD_POLL_MS = 30_000;

/** Espera antes de marcar el canal abierto como leído: si llegan varios mensajes seguidos, va un solo pedido. */
export const MARK_READ_DEBOUNCE_MS = 1_000;

export const unreadQueryKey = ['unread'] as const;

/**
 * No leídos de todos los canales que el usuario puede ver. Se piden cada UNREAD_POLL_MS y al volver a la
 * app (refetchOnWindowFocus; en mobile, con el focusManager atado a AppState).
 */
export function useUnreadQuery() {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: unreadQueryKey,
    queryFn: getUnread,
    enabled: status === 'authenticated',
    refetchInterval: UNREAD_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Los servidores con los no leídos de cada canal (`unreadCount` y `mentions`) y el total de cada servidor
 * (`unreadCount`, `unread` y `mentions`). El canal abierto (`activeChannelId`) siempre queda en 0: ya se
 * está leyendo, aunque el último pedido todavía no lo sepa.
 */
export function applyUnread(
  servers: Server[],
  unread: ChannelUnread[] | undefined,
  activeChannelId?: string | null
): Server[] {
  const byChannel = new Map((unread ?? []).map((u) => [u.channelId, u]));

  return servers.map((server) => {
    let unreadCount = 0;
    let mentions = 0;
    const decorate = (channel: Channel): Channel => {
      const u = channel.id === activeChannelId ? undefined : byChannel.get(channel.id);
      unreadCount += u?.unreadCount ?? 0;
      mentions += u?.mentionCount ?? 0;
      return { ...channel, unreadCount: u?.unreadCount ?? 0, mentions: u?.mentionCount ?? 0 };
    };

    // Los canales están en la lista plana y dentro de sus categorías: se decoran una vez y se reusan
    const decorated = new Map<string, Channel>();
    const get = (channel: Channel) => {
      if (!decorated.has(channel.id)) decorated.set(channel.id, decorate(channel));
      return decorated.get(channel.id) as Channel;
    };
    const categories = server.categories.map((category) => ({ ...category, channels: category.channels.map(get) }));
    const channels = server.channels?.map(get);

    return { ...server, channels, categories, unreadCount, unread: unreadCount > 0, mentions };
  });
}

/**
 * Marca un canal o una conversación como leídos. Optimista: sale de los no leídos al momento y vuelve si
 * falla. Los no leídos de una conversación están en la lista de conversaciones, no en /unread.
 */
export function useMarkChannelReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, messageId }: { channelId: string; messageId?: string }) =>
      markChannelRead(channelId, messageId),
    onMutate: async ({ channelId }) => {
      // Un pedido en vuelo traería el contador viejo
      await queryClient.cancelQueries({ queryKey: unreadQueryKey });
      const previous = queryClient.getQueryData<ChannelUnread[]>(unreadQueryKey);
      queryClient.setQueryData<ChannelUnread[]>(unreadQueryKey, (old) => old?.filter((u) => u.channelId !== channelId));

      const previousConversations = queryClient.getQueryData<Conversation[]>(conversationsQueryKey);
      if (isConversationId(channelId)) {
        queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (old) =>
          old?.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c))
        );
      }
      return { previous, previousConversations };
    },
    onError: (_error, { channelId }, context) => {
      queryClient.setQueryData(unreadQueryKey, context?.previous);
      if (isConversationId(channelId)) {
        queryClient.setQueryData(conversationsQueryKey, context?.previousConversations);
      }
    },
  });
}

/** "Marcar todo como leído". Optimista, como useMarkChannelReadMutation. */
export function useMarkAllReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: unreadQueryKey });
      const previous = queryClient.getQueryData<ChannelUnread[]>(unreadQueryKey);
      queryClient.setQueryData<ChannelUnread[]>(unreadQueryKey, []);
      return { previous };
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(unreadQueryKey, context?.previous);
    },
    // Lo que llegó mientras tanto vuelve a aparecer
    onSettled: () => queryClient.invalidateQueries({ queryKey: unreadQueryKey }),
  });
}

/**
 * Marca el canal abierto como leído al abrirlo y con cada mensaje que llega mientras se mira (CA 1 de
 * "Marcar notificaciones como leídas"). `enabled` en false mientras la app no está a la vista: lo que
 * llega en segundo plano queda sin leer.
 */
export function useAutoMarkChannelRead(
  channelId: string | null,
  lastMessageId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const { mutate } = useMarkChannelReadMutation();
  const marked = useRef<{ channelId: string | null; messageId?: string }>({ channelId: null });

  useEffect(() => {
    if (!enabled || !channelId || !lastMessageId) return;
    if (marked.current.channelId === channelId && marked.current.messageId === lastMessageId) return;

    const timer = setTimeout(() => {
      marked.current = { channelId, messageId: lastMessageId };
      mutate({ channelId, messageId: lastMessageId });
    }, MARK_READ_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [channelId, lastMessageId, enabled, mutate]);
}
