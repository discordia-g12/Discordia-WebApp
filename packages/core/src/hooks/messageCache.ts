import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Message } from '../types';

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
