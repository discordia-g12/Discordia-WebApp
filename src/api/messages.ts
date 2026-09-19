import { api } from './client';
import { Message } from '../types';

export interface GetMessagesOptions {
  before?: string;
  limit?: number;
}

export interface WsTicketResponse {
  ticket: string;
  expires_in: number;
}

/**
 * Consulta el historial de mensajes de un canal con paginación basada en cursor.
 */
export async function getMessages(
  channelId: string,
  options: GetMessagesOptions = {}
): Promise<Message[]> {
  const { before, limit = 50 } = options;
  return await api.get<Message[]>(`/api/v1/chat/channels/${channelId}/messages`, {
    query: { before, limit },
  });
}

/**
 * Envío de mensaje vía fallback REST (el canal normal es WebSocket).
 * Utiliza Idempotency-Key con clientMessageId para evitar duplicados en reintentos de red.
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

/**
 * Solicita un ticket efímero de un solo uso para autenticar la conexión WebSocket en Chat-Engine-Service.
 */
export async function getWsTicket(): Promise<WsTicketResponse> {
  return await api.post<WsTicketResponse>('/api/v1/chat/ws-tickets');
}

