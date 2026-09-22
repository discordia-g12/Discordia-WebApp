import { api } from './client';
import { Message } from '../types';

export interface GetMessagesOptions {
  before?: string;
  limit?: number;
}

/**
 * Consulta el historial de mensajes de un canal con paginación basada en cursor.
 */
export async function getMessages(
  channelId: string,
  options: GetMessagesOptions = {}
): Promise<Message[]> {
  const { before, limit = 50 } = options;
  const response = await api.get<{ messages: Message[] } | Message[]>(`/api/v1/chat/channels/${channelId}/messages`, {
    query: { before, limit },
  });
  if (Array.isArray(response)) {
    return response;
  }
  return response?.messages || [];
}

/**
 * Envío de mensaje vía fallback REST (el canal normal es WebSocket /api/v1/chat/channels/:channelId/ws).
 */
export async function sendMessage(
  channelId: string,
  content: string,
  clientMessageId?: string
): Promise<Message> {
  const idempotencyKey = clientMessageId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`);
  return await api.post<Message>(
    `/api/v1/chat/channels/${channelId}/messages`,
    { content, clientMessageId: idempotencyKey },
    { idempotencyKey }
  );
}
