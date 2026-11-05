import { api } from './client';
import { resolveAttachmentUrl } from './attachments';
import { Message, MessageAttachment } from '../types';

/**
 * Chat-Engine manda solo createdAt (historial, envío y WebSocket); la interfaz ordena, agrupa y muestra la
 * fecha con timestamp. Se completa acá para que web y mobile reciban siempre las dos.
 */
export function normalizeMessage(message: Message): Message {
  const time = message.timestamp ?? message.createdAt ?? '';
  const editedAt = (message as { editedAt?: string }).editedAt;
  const editedTimestamp = message.editedTimestamp ?? (editedAt ? String(editedAt) : null);
  const edited = message.edited ?? Boolean(editedTimestamp);
  const attachments = message.attachments?.map((att) => ({
    ...att,
    url: resolveAttachmentUrl(att.url),
    type: att.type ?? att.contentType,
    contentType: att.contentType ?? att.type,
  }));
  return {
    ...message,
    timestamp: time,
    createdAt: message.createdAt ?? time,
    edited,
    editedTimestamp,
    ...(editedAt ? { editedAt: String(editedAt) } : {}),
    ...(attachments ? { attachments } : {}),
  };
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
  clientMessageId?: string,
  attachments?: MessageAttachment[]
): Promise<Message> {
  const idempotencyKey =
    clientMessageId ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `msg-${Date.now()}`);
  const sent = await api.post<Message>(
    `/api/v1/chat/channels/${channelId}/messages`,
    { content, clientMessageId: idempotencyKey, ...(attachments?.length ? { attachments } : {}) },
    { idempotencyKey }
  );
  return normalizeMessage(sent);
}

/**
 * Modifica el contenido de un mensaje existente vía PATCH.
 */
export async function editMessage(
  channelId: string,
  messageId: string,
  content: string
): Promise<Message> {
  const updated = await api.patch<Message>(
    `/api/v1/chat/channels/${channelId}/messages/${messageId}`,
    { content }
  );
  return normalizeMessage(updated);
}
