import { api } from '../api/client';
import { normalizeMessage } from '../api/messages';
import type { Message } from '../types';
import type { MessageSearchPage, MessageSearchQuery } from './types';

/**
 * Busca mensajes de un servidor por texto y/o autor (GET /chat/servers/:id/messages/search). Chat-Engine
 * busca solo en los canales que el usuario puede ver; hace falta el texto, el autor o los dos.
 */
export async function searchServerMessages(serverId: string, query: MessageSearchQuery): Promise<MessageSearchPage> {
  const response = await api.get<{ messages?: Message[]; hasMore?: boolean; nextCursor?: string | null }>(
    `/api/v1/chat/servers/${encodeURIComponent(serverId)}/messages/search`,
    {
      query: {
        q: query.query || undefined,
        authorId: query.authorId || undefined,
        before: query.before,
        limit: query.limit,
      },
    }
  );
  return {
    messages: (response?.messages ?? []).map(normalizeMessage),
    hasMore: response?.hasMore === true,
    nextCursor: response?.nextCursor ?? null,
  };
}
