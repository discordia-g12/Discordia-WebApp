import { api } from './client';

/**
 * Por qué llegó el aviso. `message` es un mensaje cualquiera de un canal donde pediste nivel `all`. Uno por
 * usuario y mensaje: gana mention > dm > thread_reply > message.
 */
export type NotificationReason = 'mention' | 'dm' | 'thread_reply' | 'message';
export type NotificationLevel = 'all' | 'mentions' | 'none';
export type NotificationScopeType = 'server' | 'channel' | 'thread';

/** Un aviso de la bandeja (Notification-Service, ADR-07). */
export interface AppNotification {
  id: string;
  reason: NotificationReason;
  /** null en un DM. */
  serverId: string | null;
  /** Canal o conversación (`dm-…`). */
  channelId: string;
  /** Mensaje original del hilo, si es de un hilo. */
  threadId: string | null;
  messageId: string;
  /** Quién escribió. */
  actorId: string;
  preview: string;
  createdAt: string;
  readAt: string | null;
}

/** Lo que llega en vivo por el inbox (NOTIFICATION_CREATED): sin id, es igual para todos los destinatarios. */
export type NotificationPreview = Omit<AppNotification, 'id' | 'readAt'>;

export interface NotificationPage {
  items: AppNotification[];
  /** Hasta 100: más se muestra como "99+". */
  unreadCount: number;
  nextCursor: string | null;
}

export interface NotificationPreference {
  scopeType: NotificationScopeType;
  scopeId: string;
  serverId: string | null;
  /** null: hereda del alcance de arriba (hilo → canal → servidor). */
  level: NotificationLevel | null;
  muted: boolean;
  mutedUntil: string | null;
  updatedAt: string;
}

/** Lo que cambia un PUT: solo los campos presentes. */
export interface NotificationPreferenceChange {
  level?: NotificationLevel | null;
  muted?: boolean;
  mutedUntil?: string | null;
  serverId?: string;
}

const BASE = '/api/v1/notifications';

/** Bandeja del usuario. Una respuesta fuera de contrato (un Notification viejo, un proxy) se lee como vacía. */
export async function getNotifications(
  options: { unread?: boolean; before?: string; limit?: number } = {}
): Promise<NotificationPage> {
  const page = await api.get<Partial<NotificationPage> | null>(BASE, {
    query: { unread: options.unread ? 'true' : undefined, before: options.before, limit: options.limit },
  });
  return {
    items: Array.isArray(page?.items) ? page.items : [],
    unreadCount: typeof page?.unreadCount === 'number' ? page.unreadCount : 0,
    nextCursor: typeof page?.nextCursor === 'string' ? page.nextCursor : null,
  };
}

export function markNotificationRead(id: string) {
  return api.post<void>(`${BASE}/${id}/read`);
}

export function markAllNotificationsRead() {
  return api.post<void>(`${BASE}/read-all`);
}

/** Preferencias del usuario. Como la bandeja, una respuesta fuera de contrato (204, null) se lee como vacía. */
export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const res = await api.get<{ items?: NotificationPreference[] } | null>(`${BASE}/preferences`);
  return Array.isArray(res?.items) ? res.items : [];
}

export function setNotificationPreference(
  scopeType: NotificationScopeType,
  scopeId: string,
  change: NotificationPreferenceChange
) {
  return api.put<NotificationPreference>(`${BASE}/preferences/${scopeType}/${encodeURIComponent(scopeId)}`, change);
}

/** Contador de la campana: hasta 99, después "99+" (el servidor corta en 100). */
export function notificationBadge(unreadCount: number): string | null {
  if (unreadCount <= 0) return null;
  return unreadCount > 99 ? '99+' : String(unreadCount);
}
