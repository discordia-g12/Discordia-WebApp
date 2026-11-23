import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getThread, sendThreadReply } from '../api/threads';
import { useSession } from '../auth/session';
import type { Message, MessageAttachment } from '../types';
import { applyThreadReply, threadQueryKey } from './messageCache';

/**
 * Hilo de un mensaje (CA3, CA4): el original y las respuestas de la más vieja a la más nueva. `fetchMore`
 * pide las siguientes. El socket del canal y las acciones lo mantienen al día por el mismo caché.
 */
export function useThreadQuery(channelId: string | null, parentId: string | null) {
  const status = useSession((s) => s.status);
  const query = useInfiniteQuery({
    queryKey: threadQueryKey(channelId, parentId),
    queryFn: ({ pageParam }) => getThread(channelId as string, parentId as string, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: status === 'authenticated' && Boolean(channelId) && Boolean(parentId),
  });

  const pages = query.data?.pages;
  const replies = useMemo(() => pages?.flatMap((page) => page.replies) ?? [], [pages]);

  return {
    ...query,
    /** El mensaje original, como está ahora (con su resumen al día). */
    parent: pages?.[0]?.parent ?? null,
    replies,
    hasMore: query.hasNextPage,
    isFetchingMore: query.isFetchingNextPage,
    fetchMore: query.fetchNextPage,
  };
}

/**
 * Responder en el hilo (CA2). La respuesta se agrega apenas vuelve el POST; el resumen del original (cuántas
 * respuestas) llega por el socket con THREAD_REPLY_CREATED, que es el que cuenta las de todos.
 */
export function useSendThreadReply(channelId: string | null, parentId: string | null) {
  const queryClient = useQueryClient();
  return useCallback(
    async (content: string, attachment?: MessageAttachment): Promise<Message | null> => {
      if (!channelId || !parentId) return null;
      const reply = await sendThreadReply(channelId, parentId, content, attachment ? [attachment] : undefined);
      applyThreadReply(queryClient, channelId, parentId, reply);
      return reply;
    },
    [queryClient, channelId, parentId]
  );
}
