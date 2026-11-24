import type { AppNotification, NotificationLevel, NotificationReason } from '../api/notifications';

/**
 * Primera línea de cada aviso. `message` (nivel `all` en el canal) no te nombra: dice dónde, si se sabe el
 * nombre del canal, y si no quién escribió.
 */
export function notificationTitle(reason: NotificationReason, actorName: string, channelName?: string | null): string {
  if (reason === 'mention') return `${actorName} te mencionó`;
  if (reason === 'dm') return `${actorName} te escribió`;
  if (reason === 'thread_reply') return `${actorName} respondió en un hilo`;
  return channelName ? `Nuevo mensaje en #${channelName}` : `Nuevo mensaje de ${actorName}`;
}

/** Dónde pasó: "Mensaje directo", "#general" o "Hilo en #general". Sin el nombre del canal, "un canal". */
export function notificationPlace(
  notification: Pick<AppNotification, 'serverId' | 'threadId'>,
  channelName?: string | null
): string {
  if (!notification.serverId) return 'Mensaje directo';
  const channel = channelName ? `#${channelName}` : 'un canal';
  return notification.threadId ? `Hilo en ${channel}` : channel;
}

/**
 * A dónde lleva abrir un aviso, sin rutas: cada app lo pasa a su router. `threadId` es el mensaje raíz del
 * hilo a abrir (null si no es de un hilo) y `messageId` el mensaje que generó el aviso.
 */
export type NotificationDestination =
  | { kind: 'channel'; serverId: string; channelId: string; threadId: string | null; messageId: string }
  /** Un DM 1 a 1 se abre por el otro participante: quien escribió. `channelId` es la conversación (`dm-…`). */
  | { kind: 'dm'; userId: string; channelId: string; threadId: string | null; messageId: string };

export function notificationDestination(notification: AppNotification): NotificationDestination {
  const { serverId, channelId, threadId, messageId, actorId } = notification;
  return serverId
    ? { kind: 'channel', serverId, channelId, threadId, messageId }
    : { kind: 'dm', userId: actorId, channelId, threadId, messageId };
}

const LEVEL_LABELS: Record<NotificationLevel, string> = {
  all: 'Todos los mensajes',
  mentions: 'Solo menciones',
  none: 'Nada',
};

/** "Solo menciones". Para lo heredado: `Heredado: ${notificationLevelLabel(inherited.level)}`. */
export function notificationLevelLabel(level: NotificationLevel): string {
  return LEVEL_LABELS[level];
}
