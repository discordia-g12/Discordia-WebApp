/**
 * Fechas y agrupado de los mensajes del chat (PDF, pág. 7), iguales en web y mobile: "20/10/25, 13:25"
 * en 24 h, separadores por día ("hoy", "ayer", "21 de octubre de 2025") y los mensajes seguidos de una
 * misma persona agrupados bajo un solo encabezado.
 */

const timeFormat = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const dayFormat = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
const hourFormat = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Mensajes de una misma persona separados por menos de esto quedan agrupados. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export const validDate = (iso: string): Date | null => {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? null : date;
};

/** "20/10/25, 13:25". */
export function formatMessageTime(iso: string): string {
  const date = validDate(iso);
  return date ? timeFormat.format(date) : '';
}

/** "13:25" (la hora de un mensaje agrupado). */
export function formatMessageHour(iso: string): string {
  const date = validDate(iso);
  return date ? hourFormat.format(date) : '';
}

/** Separador de día: "hoy", "ayer" o "21 de octubre de 2025". */
export function formatDayLabel(date: Date, now = new Date()): string {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return 'hoy';
  if (date.toDateString() === yesterday.toDateString()) return 'ayer';
  return dayFormat.format(date);
}

/** Lo que hace falta de un mensaje para ubicarlo en la conversación. */
export interface ChatLine {
  authorId: string;
  timestamp: string;
  type?: string;
}

/**
 * Dónde cae un mensaje respecto del anterior: si abre un día nuevo (va con separador) y si sigue al
 * anterior de la misma persona (va sin encabezado).
 */
export function placeMessage(prev: ChatLine | null, msg: ChatLine): { newDay: Date | null; grouped: boolean } {
  const date = validDate(msg.timestamp);
  const prevDate = prev ? validDate(prev.timestamp) : null;
  const newDay = date && (!prevDate || prevDate.toDateString() !== date.toDateString()) ? date : null;
  const grouped =
    !newDay &&
    prev !== null &&
    prev.authorId === msg.authorId &&
    prev.type !== 'system' &&
    msg.type !== 'system' &&
    Math.abs(new Date(msg.timestamp).getTime() - new Date(prev.timestamp).getTime()) < GROUP_WINDOW_MS;
  return { newDay, grouped };
}
