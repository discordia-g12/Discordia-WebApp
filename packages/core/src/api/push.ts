import { api, type RequestOptions } from './client';
import type { NotificationReason } from './notifications';
import type { NotificationDestination } from '../notifications/display';
import type { Conversation } from '../types';

/**
 * Push (Notification-Service, ADR-08). Mobile registra el Expo push token; la web, la suscripción de Web Push.
 * El backend manda siempre: cada app oculta el aviso si está en primer plano.
 */
export type PushDevice =
  | { platform: 'ios' | 'android'; token: string }
  | { platform: 'web'; subscription: { endpoint: string; keys: { p256dh: string; auth: string } } };

export interface PushSettings {
  pushEnabled: boolean;
}

/** El `data` de un push (Expo `data`, o `data` del JSON de Web Push): los nombres de `AppNotification`, sin actor. */
export interface PushData {
  notificationId: string;
  reason: NotificationReason;
  serverId: string | null;
  channelId: string;
  threadId: string | null;
  messageId: string;
}

const BASE = '/api/v1/notifications/push';

export function registerPushDevice(device: PushDevice) {
  return api.post<void>(`${BASE}/devices`, device);
}

/**
 * Borra un dispositivo propio: el Expo push token, o en web el `endpoint` de la suscripción. 204 siempre. Va
 * antes de cerrar sesión (necesita el JWT): `timeoutMs` corto para no trabar el cierre.
 */
export function unregisterPushDevice(token: string, options?: Pick<RequestOptions, 'timeoutMs'>) {
  return api.delete<void>(`${BASE}/devices`, { ...options, body: { token } });
}

export function getPushSettings() {
  return api.get<PushSettings>(`${BASE}/settings`);
}

export function setPushSettings(settings: PushSettings) {
  return api.put<PushSettings>(`${BASE}/settings`, settings);
}

/** Clave pública VAPID para suscribirse en web. null: push web apagado en el backend. */
export async function getVapidPublicKey(): Promise<string | null> {
  const res = await api.get<{ publicKey?: string | null } | null>(`${BASE}/vapid-public-key`);
  return typeof res?.publicKey === 'string' && res.publicKey ? res.publicKey : null;
}

const REASONS: NotificationReason[] = ['mention', 'dm', 'thread_reply', 'message'];
const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNullableString = (v: unknown): v is string | null => v === null || v === undefined || isString(v);

/** Lee el `data` de un push. Viene de afuera de la app: lo que no tiene la forma del contrato da null. */
export function parsePushData(raw: unknown): PushData | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (!isString(d.notificationId) || !isString(d.channelId) || !isString(d.messageId)) return null;
  if (!REASONS.includes(d.reason as NotificationReason)) return null;
  if (!isNullableString(d.serverId) || !isNullableString(d.threadId)) return null;
  return {
    notificationId: d.notificationId,
    reason: d.reason as NotificationReason,
    serverId: d.serverId ?? null,
    channelId: d.channelId,
    threadId: d.threadId ?? null,
    messageId: d.messageId,
  };
}

/**
 * El mismo destino que `notificationDestination` para un push. El push no trae quién escribió, y el id de un DM
 * (`dm-<ObjectId>`) no tiene a los participantes: el otro usuario sale de la lista de conversaciones. null si
 * el `data` no es válido o el DM no está en la lista.
 */
export function pushDataToDestination(
  raw: unknown,
  conversations: Pick<Conversation, 'id' | 'otherUserId'>[] | undefined
): NotificationDestination | null {
  const data = parsePushData(raw);
  if (!data) return null;
  const { serverId, channelId, threadId, messageId } = data;
  if (serverId) return { kind: 'channel', serverId, channelId, threadId, messageId };
  const userId = conversations?.find((c) => c.id === channelId)?.otherUserId;
  return userId ? { kind: 'dm', userId, channelId, threadId, messageId } : null;
}
