import { useEffect, useMemo, useRef, useState } from 'react';
import {
  notificationDestination,
  notificationPlace,
  notificationTitle,
  useNotificationsQuery,
  usePushSettings,
  useServersQuery,
  type NotificationPreview,
} from '@discordia/core';
import { getPreferences, usePreferences } from '../../app/preferences';
import { useUsers } from '../../app/usersContext';
import { getPushSubscription } from '../../platform/push';
import { openDestination } from './notificationActions';

/*
 * Lo que pasa en este navegador cuando llega un aviso con la app abierta (Ajustes → Notificación):
 *   - sonido: un "ding" corto;
 *   - escritorio: aviso del sistema si la pestaña no tiene el foco. Si este navegador tiene push activo no se
 *     muestra, porque el service worker ya avisa (public/sw.js) y serían dos;
 *   - vista previa: el aviso de escritorio dice el comienzo del mensaje, o solo dónde pasó;
 *   - contador: los avisos sin leer en el título de la pestaña.
 * Con la app cerrada avisa el push, que arma el servidor: estas preferencias no lo cambian.
 */

// ── Avisos en vivo del inbox ──
// El inbox se monta en ChatConnectionProvider, afuera de UsersProvider: publica acá y NotificationAlerts
// (adentro, con los nombres a mano) los recibe.

type Listener = (notification: NotificationPreview) => void;
const listeners = new Set<Listener>();

/** Para useInbox({ onNotification }). */
export function publishIncomingNotification(notification: NotificationPreview) {
  listeners.forEach((listener) => listener(notification));
}

function subscribeIncomingNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── Sonido ──

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

let audioContext: AudioContext | null = null;

/**
 * Dos notas cortas y suaves, sintetizadas (como el timbre de las llamadas, sin archivos). Si el navegador
 * todavía no deja reproducir audio (no hubo ningún gesto en la página), no suena: no es un error.
 */
export function playNotificationSound() {
  const Ctor = audioContextCtor();
  if (!Ctor) return;
  try {
    audioContext ??= new Ctor();
  } catch {
    return;
  }
  const ctx = audioContext;
  ctx
    .resume()
    .then(() => {
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;
      for (const [frequency, start] of [
        [988, 0],
        [1319, 0.09],
      ] as const) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(0.12, now + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + 0.26);
      }
    })
    .catch(() => undefined);
}

// ── Escritorio ──

const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

/** ¿Este navegador ya recibe el push? Entonces el service worker avisa y no hace falta otro aviso. */
async function pushActiveHere(pushEnabled: boolean): Promise<boolean> {
  if (!pushEnabled) return false;
  try {
    return (await getPushSubscription()) !== null;
  } catch {
    return false;
  }
}

/** Sonido y aviso de escritorio de los avisos en vivo. Se monta una vez, adentro de UsersProvider. */
function useIncomingNotificationAlerts() {
  const { usersMap } = useUsers();
  const { data: servers } = useServersQuery();
  const { pushEnabled } = usePushSettings();

  const channelNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const server of servers ?? []) {
      for (const category of server.categories) for (const channel of category.channels) names.set(channel.id, channel.name);
    }
    return names;
  }, [servers]);

  // En un ref: que cambie la lista de usuarios no vuelve a suscribir
  const contextRef = useRef({ usersMap, channelNames, pushEnabled });
  contextRef.current = { usersMap, channelNames, pushEnabled };

  useEffect(
    () =>
      subscribeIncomingNotifications((notification) => {
        const prefs = getPreferences();
        if (prefs.sounds) playNotificationSound();

        if (!prefs.desktopNotifications || !notificationsSupported() || Notification.permission !== 'granted') return;
        // Con la pestaña al frente ya se ve en la bandeja
        if (document.visibilityState === 'visible' && document.hasFocus()) return;

        const { usersMap: users, channelNames: names, pushEnabled: push } = contextRef.current;
        void pushActiveHere(push).then((pushHere) => {
          if (pushHere) return;
          const actor = users[notification.actorId]?.displayName ?? 'Alguien';
          const channelName = names.get(notification.channelId);
          const shown = new Notification(notificationTitle(notification.reason, actor, channelName), {
            body: prefs.notificationPreview && notification.preview ? notification.preview : notificationPlace(notification, channelName),
            icon: '/favicon.svg',
            tag: notification.messageId,
          });
          shown.onclick = () => {
            window.focus();
            openDestination(notificationDestination(notification));
            shown.close();
          };
        });
      }),
    []
  );
}

/** El interruptor "Notificaciones de escritorio" de Ajustes: prenderlo pide el permiso del navegador. */
export function useDesktopNotificationsToggle() {
  const enabled = usePreferences((p) => p.desktopNotifications);
  const setPreference = usePreferences((p) => p.setPreference);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationsSupported() ? Notification.permission : 'unsupported'
  );

  let unavailable: string | null = null;
  if (permission === 'unsupported') unavailable = 'Este navegador no muestra avisos del sistema.';
  else if (permission === 'denied') unavailable = 'Bloqueaste las notificaciones de Discordia: habilitalas en los permisos del sitio del navegador.';

  const toggle = async (next: boolean) => {
    setPreference('desktopNotifications', next);
    if (next && permission === 'default') {
      try {
        setPermission(await Notification.requestPermission());
      } catch {
        // Navegadores viejos: requestPermission con callback. Sin permiso, no se muestra nada
      }
    }
  };

  return {
    checked: enabled && permission === 'granted',
    disabled: unavailable !== null,
    unavailable,
    toggle,
  };
}

// ── Contador ──

const COUNT_PREFIX = /^\(\d+\+?\) /;

/** Avisos sin leer en el título de la pestaña ("(3) Discordia") y en el ícono de la app instalada. */
function useUnreadBadge() {
  const { unreadCount } = useNotificationsQuery();
  const enabled = usePreferences((p) => p.unreadBadge);
  const count = enabled ? unreadCount : 0;

  useEffect(() => {
    const label = count > 99 ? '99+' : String(count);
    const base = document.title.replace(COUNT_PREFIX, '');
    document.title = count > 0 ? `(${label}) ${base}` : base;

    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (count > 0) nav.setAppBadge?.(count).catch(() => undefined);
    else nav.clearAppBadge?.().catch(() => undefined);
  }, [count]);
}

/** Sonido, aviso de escritorio y contador. Se monta una vez en la app autenticada (App.tsx). */
export function NotificationAlerts() {
  useIncomingNotificationAlerts();
  useUnreadBadge();
  return null;
}
