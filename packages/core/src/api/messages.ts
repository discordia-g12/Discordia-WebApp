import { api } from './client';
import { resolveAttachmentUrl } from './attachments';
import { getApiMock } from './mock';
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
  const isDeleted = message.type === 'deleted' || (message as { isDeleted?: boolean }).isDeleted === true;
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
    type: isDeleted ? 'deleted' : (message.type ?? 'normal'),
    content: isDeleted ? '' : message.content,
    edited: isDeleted ? false : edited,
    editedTimestamp: isDeleted ? null : editedTimestamp,
    attachments: isDeleted ? undefined : attachments,
    ...(editedAt && !isDeleted ? { editedAt: String(editedAt) } : {}),
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
  const mock = getApiMock();
  if (mock?.getMessages) return mock.getMessages(channelId, options);

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
  const mock = getApiMock();
  if (mock?.sendMessage) return mock.sendMessage(channelId, content, attachments);

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

/**
 * Elimina un mensaje existente vía DELETE (soft-delete).
 */
export async function deleteMessage(
  channelId: string,
  messageId: string
): Promise<Message> {
  const mock = getApiMock();
  if (mock?.deleteMessage) return mock.deleteMessage(channelId, messageId);

  const deleted = await api.delete<Message>(
    `/api/v1/chat/channels/${channelId}/messages/${messageId}`
  );
  return normalizeMessage(deleted);
}
