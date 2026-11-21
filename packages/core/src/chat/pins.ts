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

/** Ir a un fijado: el mensaje no apareció en las páginas que se pidieron (o ya no existe). */
export const JUMP_NOT_FOUND_MESSAGE = 'No se encontró el mensaje: está muy atrás en el historial o fue eliminado';
/** Ir a un fijado: falló la red al pedir las páginas anteriores. */
export const JUMP_LOAD_FAILED_MESSAGE = 'No se pudieron cargar los mensajes anteriores';

/** Páginas anteriores que se piden como mucho para llegar a un mensaje (50 por página: 1000 mensajes). */
export const MAX_JUMP_PAGES = 20;

export interface LoadUntilMessageOptions {
  /** Si el mensaje ya está entre los cargados. */
  isLoaded: () => boolean;
  /** Pide la página anterior. Devuelve si quedan más. Si falla, rechaza. */
  loadOlder: () => Promise<boolean>;
  maxPages?: number;
}

/**
 * Pide páginas anteriores del historial hasta tener el mensaje cargado, para poder ir a él (desde los
 * fijados). Devuelve false si no apareció: el canal se terminó o el mensaje está más atrás que maxPages.
 * Cada app pone cómo pedir la página: web y los DMs de mobile con React Query, los canales de mobile con
 * su DataProvider.
 */
export async function loadUntilMessage({ isLoaded, loadOlder, maxPages = MAX_JUMP_PAGES }: LoadUntilMessageOptions): Promise<boolean> {
  for (let page = 0; !isLoaded(); page++) {
    if (page >= maxPages) return false;
    const hasMore = await loadOlder();
    if (!hasMore) return isLoaded();
  }
  return true;
}
