import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSession } from '../auth/session';
import { ApiError } from '../api/errors';
import type { Message } from '../types';
import { searchServerMessages } from './api';
import { MESSAGE_SEARCH_MAX_LENGTH, MESSAGE_SEARCH_PAGE_SIZE } from './types';

/** Lo que se busca: el texto (ya recortado) y el autor elegido. */
export interface MessageSearchFilters {
  query: string;
  authorId: string | null;
}

/** Se puede buscar con un texto (de hasta el máximo), con un autor o con los dos. */
export function canSearchMessages({ query, authorId }: MessageSearchFilters): boolean {
  const term = query.trim();
  return term.length <= MESSAGE_SEARCH_MAX_LENGTH && (term.length > 0 || Boolean(authorId));
}

export function messageSearchErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión no es válida o expiró.';
    if (error.status === 503) return 'La búsqueda no está disponible en este momento. Probá de nuevo en un rato.';
    if (error.status === 400 && error.detail) return error.detail;
  }
  return 'No se pudo completar la búsqueda.';
}

export function messageSearchQueryKey(serverId: string | null, filters: MessageSearchFilters | null) {
  return ['message-search', serverId, filters?.query ?? null, filters?.authorId ?? null] as const;
}

export interface UseMessageSearchOptions {
  limit?: number;
}

/**
 * Búsqueda de mensajes de un servidor. El texto y el autor se editan libremente y la búsqueda corre recién
 * al llamar a `submit` (no en cada tecla). Pagina con cursor: `loadMore` trae los más viejos.
 */
export function useMessageSearch(serverId: string | null, options: UseMessageSearchOptions = {}) {
  const { limit = MESSAGE_SEARCH_PAGE_SIZE } = options;
  const status = useSession((s) => s.status);
  const [query, setQuery] = useState('');
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<MessageSearchFilters | null>(null);

  const canSubmit = canSearchMessages({ query, authorId });

  const submit = useCallback(() => {
    if (!canSearchMessages({ query, authorId })) return;
    setSubmitted({ query: query.trim(), authorId });
  }, [query, authorId]);

  const clear = useCallback(() => {
    setQuery('');
    setAuthorId(null);
    setSubmitted(null);
  }, []);

  const search = useInfiniteQuery({
    queryKey: messageSearchQueryKey(serverId, submitted),
    queryFn: ({ pageParam }) =>
      searchServerMessages(serverId as string, {
        query: submitted?.query,
        authorId: submitted?.authorId ?? undefined,
        before: pageParam,
        limit,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined),
    enabled: status === 'authenticated' && Boolean(serverId) && submitted !== null,
    // Un 400 no se arregla reintentando
    retry: (failureCount, error) => !(error instanceof ApiError && error.status < 500) && failureCount < 2,
  });

  const messages: Message[] = useMemo(() => search.data?.pages.flatMap((page) => page.messages) ?? [], [search.data]);

  return {
    query,
    setQuery,
    authorId,
    setAuthorId,
    canSubmit,
    submit,
    clear,
    /** La última búsqueda que se ejecutó (null antes de la primera). */
    submitted,
    messages,
    isLoading: submitted !== null && search.isLoading,
    /** Ya terminó una búsqueda y no encontró nada (CA 3). */
    isEmpty: submitted !== null && search.isSuccess && messages.length === 0,
    hasNextPage: Boolean(search.hasNextPage),
    isFetchingNextPage: search.isFetchingNextPage,
    loadMore: search.fetchNextPage,
    refetch: search.refetch,
    error: search.error,
    errorMessage: search.error ? messageSearchErrorMessage(search.error) : null,
  };
}
