import type { NotificationLevel, NotificationPreference } from '../api/notifications';

/**
 * Dónde se mira una preferencia. Un DM es un canal (`dm-…`) con `serverId` null. Sin `channelId` es el
 * servidor entero.
 */
export interface NotificationScope {
  serverId: string | null;
  channelId?: string | null;
  threadId?: string | null;
}

export interface ResolvedNotificationPreference {
  level: NotificationLevel;
  muted: boolean;
}

/** Default sin preferencias, el mismo del backend: en un servidor solo lo que te nombra; en un DM, todo. */
export function defaultNotificationLevel(scope: Pick<NotificationScope, 'serverId'>): NotificationLevel {
  return scope.serverId ? 'mentions' : 'all';
}

/** Si esta preferencia silencia ahora: `muted` y sin fecha de fin o con la fecha por delante. */
export const isPreferenceMuted = (pref: NotificationPreference, now: Date = new Date()) =>
  pref.muted && (pref.mutedUntil === null || new Date(pref.mutedUntil).getTime() > now.getTime());

/**
 * Preferencia efectiva, igual que `resolve` de rules.ts en Notification-Service: hilo → canal → servidor →
 * default, gana el primer `level` no nulo; un silencio vigente en cualquier nivel de la cadena silencia.
 */
export function resolveNotificationPreference(
  prefs: NotificationPreference[] | undefined,
  scope: NotificationScope,
  now: Date = new Date()
): ResolvedNotificationPreference {
  const find = (scopeType: NotificationPreference['scopeType'], scopeId: string | null | undefined) =>
    scopeId ? prefs?.find((p) => p.scopeType === scopeType && p.scopeId === scopeId) : undefined;
  const chain = [
    find('thread', scope.threadId),
    find('channel', scope.channelId),
    find('server', scope.serverId),
  ].filter((p): p is NotificationPreference => p !== undefined);

  const level = chain.find((p) => p.level !== null)?.level ?? defaultNotificationLevel(scope);
  return { level, muted: chain.some((p) => isPreferenceMuted(p, now)) };
}
