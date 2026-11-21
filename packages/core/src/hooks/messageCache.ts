import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Message } from '../types';
import { sortPinnedMessages } from '../chat/pins';

/** Mensajes por página del historial (lo mismo que Chat-Engine usa por defecto). */
export const MESSAGES_PAGE_SIZE = 50;

/**
 * Caché del historial de un canal (['messages', channelId]): la página 0 es la más nueva y cada página
 * siguiente es más vieja. Dentro de cada página, los mensajes van en orden cronológico.
 */
export type MessagePages = InfiniteData<Message[], string | undefined>;

export function messagesQueryKey(channelId: string | null) {
  return ['messages', channelId] as const;
}

/** El cursor para pedir la página anterior: el id del mensaje más viejo; undefined si no hay más. */
export function olderPageParam(oldestPage: Message[], pageSize = MESSAGES_PAGE_SIZE): string | undefined {
  return oldestPage.length < pageSize ? undefined : oldestPage[0]?.id;
}

/** Todas las páginas en una sola lista, en orden cronológico (de la más vieja a la más nueva). */
export function flattenMessagePages(data: MessagePages): Message[] {
  return [...data.pages].reverse().flat();
}

/** Agrega un mensaje nuevo al final de la página más nueva, salvo que ya esté en alguna página. */
export function appendMessage(data: MessagePages | undefined, message: Message): MessagePages | undefined {
  if (!data || data.pages.length === 0) return data;
  if (data.pages.some((page) => page.some((m) => m.id === message.id))) return data;
  const [newest, ...older] = data.pages;
  return { ...data, pages: [[...newest, message], ...older] };
}

/**
 * Aplica `update` a los mensajes del canal en el caché (cada página por separado). Sirve para cambios
 * mensaje por mensaje (editar, borrar, reaccionar), que no cambian en qué página está cada uno.
 */
export function updateCachedMessages(
  queryClient: QueryClient,
  channelId: string,
  update: (messages: Message[]) => Message[]
) {
  queryClient.setQueryData<MessagePages>(messagesQueryKey(channelId), (old) =>
    old ? { ...old, pages: old.pages.map(update) } : old
  );
}

/** Fijados de un canal o DM (`GET /pins`), del fijado más reciente al más viejo. */
export function pinnedMessagesQueryKey(channelId: string | null) {
  return ['pins', channelId] as const;
}

/**
 * Pone la lista de fijados al día con un mensaje: si está fijado lo agrega o actualiza, si no lo saca. Si la
 * lista todavía no se pidió no la crea (cuando llegue, ya viene al día).
 */
export function syncPinnedMessage(queryClient: QueryClient, channelId: string, message: Message) {
  queryClient.setQueryData<Message[]>(pinnedMessagesQueryKey(channelId), (old) => {
    if (!old) return old;
    const existing = old.find((m) => m.id === message.id);
    if (!message.isPinned) return existing ? old.filter((m) => m.id !== message.id) : old;
    const merged = { ...existing, ...message };
    return sortPinnedMessages(existing ? old.map((m) => (m.id === message.id ? merged : m)) : [...old, merged]);
  });
}

/**
 * Lo que manda el servidor sobre un mensaje que ya existe (MESSAGE_UPDATED, reacciones, respuesta de un PUT):
 * se mezcla en el historial y en la lista de fijados. Lo usan el socket del canal, el inbox y las acciones.
 */
export function mergeCachedMessage(queryClient: QueryClient, channelId: string, message: Message) {
  updateCachedMessages(queryClient, channelId, (list) =>
    list.map((m) => (m.id === message.id ? { ...m, ...message } : m))
  );
  syncPinnedMessage(queryClient, channelId, message);
}

/** Un mensaje borrado: queda como "eliminado" en el historial y sale de los fijados. */
export function markCachedMessageDeleted(queryClient: QueryClient, channelId: string, message: Message) {
  updateCachedMessages(queryClient, channelId, (list) =>
    list.map((m) =>
      m.id === message.id ? { ...m, ...message, type: 'deleted' as const, content: '', attachments: [], isPinned: false } : m
    )
  );
  syncPinnedMessage(queryClient, channelId, { ...message, isPinned: false });
}
