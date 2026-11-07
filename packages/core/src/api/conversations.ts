import { api } from './client';
import { normalizeMessage } from './messages';
import { getApiMock } from './mock';
import type { Conversation, Message, MessageAttachment } from '../types';

const CONVERSATION_ID_PREFIX = 'dm-';

/** true si el id de un "canal" es en realidad una conversación directa. */
export function isConversationId(channelId: string | null | undefined): boolean {
  return Boolean(channelId?.startsWith(CONVERSATION_ID_PREFIX));
}

/** La conversación con un usuario (null si todavía no existe) y si se le puede escribir. */
export interface ConversationWith {
  conversation: Conversation | null;
  canMessage: boolean;
}

export interface StartConversationRequest {
  recipientId: string;
  content: string;
  attachments?: MessageAttachment[];
}

export interface StartConversationResponse {
  conversation: Conversation;
  message: Message;
}

/** Conversaciones del usuario, de la más reciente a la más vieja, sin las que rechazó. */
export async function getConversations(): Promise<Conversation[]> {
  const mock = getApiMock();
  if (mock?.getConversations) return mock.getConversations();

  return (await api.get<Conversation[]>('/api/v1/chat/conversations')) || [];
}

/**
 * Consulta la conversación con un usuario. Es un PUT porque, si ya son amigos, una conversación pendiente o
 * rechazada pasa a `accepted`. Nunca crea nada: la conversación nace con el primer mensaje.
 */
export async function getConversationWith(userId: string): Promise<ConversationWith> {
  const mock = getApiMock();
  if (mock?.getConversationWith) return mock.getConversationWith(userId);

  return api.put<ConversationWith>(`/api/v1/chat/conversations/with/${encodeURIComponent(userId)}`);
}

/**
 * Manda el primer mensaje a un usuario: crea la conversación, o reutiliza la que ya hay. Rechaza con
 * 403 DM_NOT_DELIVERABLE si hay un bloqueo o una suspensión (ver dmSendErrorMessage).
 */
export async function startConversation(payload: StartConversationRequest): Promise<StartConversationResponse> {
  const mock = getApiMock();
  if (mock?.startConversation) return mock.startConversation(payload);

  const { recipientId, content, attachments } = payload;
  const { conversation, message } = await api.post<StartConversationResponse>('/api/v1/chat/conversations', {
    recipientId,
    content,
    ...(attachments?.length ? { attachments } : {}),
  });
  return { conversation, message: normalizeMessage(message) };
}

/** Acepta una solicitud de mensaje. Solo el destinatario. No los hace amigos. */
export async function acceptConversation(conversationId: string): Promise<Conversation> {
  const mock = getApiMock();
  if (mock?.acceptConversation) return mock.acceptConversation(conversationId);

  return api.post<Conversation>(`/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/accept`);
}

/** Rechaza una solicitud de mensaje. Solo el destinatario. Quien la inició no se entera. */
export async function declineConversation(conversationId: string): Promise<void> {
  const mock = getApiMock();
  if (mock?.declineConversation) return mock.declineConversation(conversationId);

  await api.post<void>(`/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/decline`);
}
