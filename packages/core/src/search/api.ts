import { api } from '../api/client';
import { normalizeMessage } from '../api/messages';
import type { Message } from '../types';
import type { MessageSearchPage, MessageSearchQuery } from './types';

type SearchResponse = { messages?: Message[]; hasMore?: boolean; nextCursor?: string | null };

/** GET de una página de búsqueda: los filtros vacíos no se mandan y los mensajes salen normalizados. */
async function fetchSearchPage(path: string, query: MessageSearchQuery): Promise<MessageSearchPage> {
  const response = await api.get<SearchResponse>(path, {
    query: {
      q: query.query || undefined,
      authorId: query.authorId || undefined,
      before: query.before,
      limit: query.limit,
    },
  });
  return {
    messages: (response?.messages ?? []).map(normalizeMessage),
    hasMore: response?.hasMore === true,
    nextCursor: response?.nextCursor ?? null,
  };
}

/**
 * Busca mensajes de un servidor por texto y/o autor (GET /chat/servers/:id/messages/search). Chat-Engine
 * busca solo en los canales que el usuario puede ver; hace falta el texto, el autor o los dos.
 */
export function searchServerMessages(serverId: string, query: MessageSearchQuery): Promise<MessageSearchPage> {
  return fetchSearchPage(`/api/v1/chat/servers/${encodeURIComponent(serverId)}/messages/search`, query);
}

/**
 * La misma búsqueda dentro de un solo canal o DM (GET /chat/channels/:id/messages/search), con el acceso del
 * historial: en un DM hay que participar.
 */
export function searchChannelMessages(channelId: string, query: MessageSearchQuery): Promise<MessageSearchPage> {
  return fetchSearchPage(`/api/v1/chat/channels/${encodeURIComponent(channelId)}/messages/search`, query);
}
