import { registerPushDevice, unregisterPushDevice } from '@discordia/core';

/**
 * Web Push del navegador (ADR-08): service worker (public/sw.js), suscripción con la clave VAPID y registro en
 * Notification-Service. El permiso se pide solo desde el interruptor de Ajustes (gesto del usuario), nunca al
 * cargar. En iOS/iPadOS Safari solo hay push con la web instalada en la pantalla de inicio (PWA).
 */

/** Cuánto espera el cierre de sesión al DELETE de la suscripción antes de seguir igual. */
export const UNREGISTER_TIMEOUT_MS = 3_000;

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/** Registra el service worker al arrancar. No pide permisos: solo deja listo el click en los avisos. */
export function registerServiceWorker() {
  if (!isPushSupported()) return;
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
}

/** La clave VAPID viene en base64url; pushManager.subscribe la quiere en bytes. */
export function vapidKeyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** La suscripción de este navegador, si hay. null sin soporte o sin service worker registrado. */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export type SubscribeResult = 'subscribed' | 'denied';

/**
 * Pide permiso, se suscribe con la clave VAPID y registra la suscripción en el backend. 'denied' si el usuario
 * no dio permiso. Lanza si el navegador o el backend fallan.
 */
export async function subscribeToPush(publicKey: string): Promise<SubscribeResult> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyToBytes(publicKey) }));
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('Suscripción de push incompleta');
  await registerPushDevice({ platform: 'web', subscription: { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } } });
  return 'subscribed';
}

/**
 * Borra la suscripción del backend y del navegador. Va antes de cerrar sesión (el DELETE usa el JWT) y nunca
 * lanza: el cierre sigue igual. Así la próxima cuenta en este navegador no recibe los avisos de la anterior.
 */
export async function unregisterFromPush(): Promise<void> {
  try {
    const subscription = await getPushSubscription();
    if (!subscription) return;
    await unregisterPushDevice(subscription.endpoint, { timeoutMs: UNREGISTER_TIMEOUT_MS }).catch(() => {});
    await subscription.unsubscribe();
  } catch {
    // Sin service worker o sin permiso: no hay nada que borrar
  }
}
