import type { Channel, Server } from '../../types';

/** Contador como se muestra: a partir de 100 (el tope de Chat-Engine), "99+". */
export function formatUnreadCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

/** Actividad de un servidor para la etiqueta de su franja, o false si no hay nada sin leer. */
export function serverUnreadLabel(server: Server): string | false {
  const count = server.unreadCount ?? 0;
  if (count <= 0) return false;
  if (server.mentions) return server.mentions === 1 ? '1 mención' : `${formatUnreadCount(server.mentions)} menciones`;
  return count === 1 ? '1 mensaje nuevo' : `${formatUnreadCount(count)} mensajes nuevos`;
}

/** Lo no leído de un canal para lectores de pantalla ("3 mensajes nuevos"), o '' si no hay. */
export function channelUnreadDescription(channel: Channel): string {
  const count = channel.unreadCount ?? 0;
  if (count <= 0) return '';
  const messages = count === 1 ? '1 mensaje nuevo' : `${formatUnreadCount(count)} mensajes nuevos`;
  return channel.mentions ? `${messages}, con menciones` : messages;
}
