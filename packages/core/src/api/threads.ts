import { api } from './client';
import { normalizeMessage } from './messages';
import type { Message, MessageAttachment } from '../types';

/** Respuestas por página del hilo (lo mismo que Chat-Engine usa por defecto). */
export const THREAD_PAGE_SIZE = 50;

/** Una página del hilo: el mensaje original siempre viene (CA4), las respuestas de la más vieja a la más nueva. */
export interface ThreadPage {
  parent: Message;
  replies: Message[];
  hasMore: boolean;
  /** Para pedir la página siguiente (`after`); null si no hay más. */
  nextCursor: string | null;
}

const threadPath = (channelId: string, parentId: string) =>
  `/api/v1/chat/channels/${channelId}/messages/${parentId}/thread`;

/** Hilo de un mensaje en un canal o DM (`dm-…`). */
export async function getThread(channelId: string, parentId: string, after?: string): Promise<ThreadPage> {
  const page = await api.get<ThreadPage>(threadPath(channelId, parentId), {
    query: { after, limit: THREAD_PAGE_SIZE },
  });
  return {
    ...page,
    parent: normalizeMessage(page.parent),
    replies: (page.replies ?? []).map(normalizeMessage),
  };
}

/** Responde en el hilo. Por REST (no por el socket): así el error de un envío vuelve en esta promesa. */
export async function sendThreadReply(
  channelId: string,
  parentId: string,
  content: string,
  attachments?: MessageAttachment[]
): Promise<Message> {
  const reply = await api.post<Message>(threadPath(channelId, parentId), {
    content,
    ...(attachments?.length ? { attachments } : {}),
  });
  return normalizeMessage(reply);
}
