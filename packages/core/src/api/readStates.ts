import { api } from './client';

/** Lo no leído de un canal (Chat-Engine solo devuelve los que tienen algo). */
export interface ChannelUnread {
  channelId: string;
  /** Mensajes de otros sin leer; Chat-Engine corta en UNREAD_COUNT_CAP. */
  unreadCount: number;
  /** Menciones sin leer. Siempre 0 hasta que existan las menciones. */
  mentionCount: number;
}

/** Tope del contador que usa Chat-Engine: a partir de acá la interfaz muestra "99+". */
export const UNREAD_COUNT_CAP = 100;

/** Canales con mensajes sin leer, entre todos los que el usuario puede ver (GET /chat/unread). */
export async function getUnread(): Promise<ChannelUnread[]> {
  const response = await api.get<{ channels: ChannelUnread[] }>('/api/v1/chat/unread');
  return response?.channels ?? [];
}

/** Marca el canal como leído hasta `messageId`, o hasta el último mensaje si no viene. Nunca retrocede. */
export async function markChannelRead(channelId: string, messageId?: string): Promise<void> {
  await api.post<void>(`/api/v1/chat/channels/${channelId}/read`, messageId ? { messageId } : undefined);
}

/** Marca como leídos todos los canales que el usuario puede ver. */
export async function markAllRead(): Promise<void> {
  await api.post<void>('/api/v1/chat/read-states/read-all');
}
