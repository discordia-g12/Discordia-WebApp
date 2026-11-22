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
  const pinned = (message as { pinned?: boolean }).pinned ?? message.isPinned ?? false;
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
    // Un aviso del sistema sigue siéndolo aunque llegue como MESSAGE_REACTION_UPDATED (alguien lo saludó):
    // `system` viene en todos sus payloads, `type` a veces trae el tipo de evento del WebSocket
    type: isDeleted ? 'deleted' : message.system ? 'system' : (message.type ?? 'normal'),
    content: isDeleted ? '' : message.content,
    edited: isDeleted ? false : edited,
    editedTimestamp: isDeleted ? null : editedTimestamp,
    attachments: isDeleted ? undefined : attachments,
    reactions: isDeleted ? [] : (message.reactions ?? []),
    // Siempre definido: al mergear un MESSAGE_UPDATED de un desfijado tiene que pisar el true anterior
    isPinned: !isDeleted && pinned,
    pinnedAt: !isDeleted && pinned ? (message.pinnedAt ?? null) : null,
    pinnedBy: !isDeleted && pinned ? (message.pinnedBy ?? null) : null,
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

/**
 * Alterna una reacción con emoji en un mensaje existente vía PUT.
 * Si el usuario ya había reaccionado con ese emoji, se retira; si no, se agrega.
 */
export async function toggleReaction(
  channelId: string,
  messageId: string,
  emoji: string
): Promise<Message> {
  const mock = getApiMock();
  if (mock?.toggleReaction) return mock.toggleReaction(channelId, messageId, emoji);

  const updated = await api.put<Message>(
    `/api/v1/chat/channels/${channelId}/messages/${messageId}/reactions`,
    { emoji }
  );
  return normalizeMessage(updated);
}

/**
 * Fija (PUT) o desfija (DELETE) un mensaje. En un canal de servidor requiere MANAGE_MESSAGES; en un DM puede
 * cualquiera de los dos. Es idempotente. Con el límite de fijados alcanzado responde 409.
 */
export async function setMessagePinned(channelId: string, messageId: string, pinned: boolean): Promise<Message> {
  const mock = getApiMock();
  if (mock?.setMessagePinned) return mock.setMessagePinned(channelId, messageId, pinned);

  const path = `/api/v1/chat/channels/${channelId}/messages/${messageId}/pin`;
  const updated = pinned ? await api.put<Message>(path) : await api.delete<Message>(path);
  return normalizeMessage(updated);
}

/** Mensajes fijados de un canal o DM, del fijado más reciente al más viejo (como mucho PINNED_LIMIT). */
export async function getPinnedMessages(channelId: string): Promise<Message[]> {
  const mock = getApiMock();
  if (mock?.getPinnedMessages) return mock.getPinnedMessages(channelId);

  const list = await api.get<Message[]>(`/api/v1/chat/channels/${channelId}/pins`);
  return (list ?? []).map(normalizeMessage);
}
