import type { Message } from '../types';

/** Máximo de mensajes fijados por canal o DM. Lo aplica Chat-Engine (409 al pasarlo); acá es para los textos. */
export const PINNED_LIMIT = 50;

/** Chat-Engine identifica un DM con `dm-<conversationId>` como channelId (historial, fijados, socket). */
export function isDirectChannelId(channelId: string | null | undefined): boolean {
  return Boolean(channelId?.startsWith('dm-'));
}

export interface CanPinContext {
  /** Es un DM: puede fijar cualquiera de los dos participantes. */
  isDirect: boolean;
  /** En un canal de servidor, si el usuario tiene MANAGE_MESSAGES (canInChannel). */
  canManageMessages?: boolean;
}

type PinnableMessage = Pick<Message, 'type'> & { status?: string };

/** Si el usuario puede fijar en esta conversación: en un DM cualquiera de los dos, en un canal con MANAGE_MESSAGES. */
export function canPinMessages({ isDirect, canManageMessages = false }: CanPinContext): boolean {
  return isDirect || canManageMessages;
}

/** Un mensaje borrado, de sistema o que todavía no confirmó el servidor (`status` de mobile) no se fija. */
export function isPinnableMessage(message: PinnableMessage): boolean {
  if (message.type === 'deleted' || message.type === 'system') return false;
  return message.status !== 'pending' && message.status !== 'failed';
}

/** Si el usuario puede fijar o desfijar este mensaje: canPinMessages + isPinnableMessage. */
export function canPinMessage(message: PinnableMessage, context: CanPinContext): boolean {
  return canPinMessages(context) && isPinnableMessage(message);
}

/** Fijados del más reciente al más viejo (como los devuelve `GET /pins`). */
export function sortPinnedMessages(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => (b.pinnedAt ?? '').localeCompare(a.pinnedAt ?? ''));
}
