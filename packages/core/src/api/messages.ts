import { api } from './client';
import { Message } from '../types';

/**
 * Chat-Engine manda solo createdAt (historial, envío y WebSocket); la interfaz ordena, agrupa y muestra la
 * fecha con timestamp. Se completa acá para que web y mobile reciban siempre las dos.
 */
export function normalizeMessage(message: Message): Message {
  const time = message.timestamp ?? message.createdAt ?? '';
  return { ...message, timestamp: time, createdAt: message.createdAt ?? time };
}

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
  const list = Array.isArray(response) ? response : response?.messages || [];
  return list.map(normalizeMessage);
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
  const sent = await api.post<Message>(
    `/api/v1/chat/channels/${channelId}/messages`,
    { content, clientMessageId: idempotencyKey },
    { idempotencyKey }
  );
  return normalizeMessage(sent);
}
