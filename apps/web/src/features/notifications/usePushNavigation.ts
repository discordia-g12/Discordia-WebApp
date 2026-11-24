import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { resolvePushDestination } from '@discordia/core';
import { isPushSupported } from '../../platform/push';
import { openDestination } from './notificationActions';

/**
 * Click en un aviso de push (public/sw.js): con una ventana abierta llega como mensaje `push-open`; sin ventana,
 * el service worker abre `/?push=<data>`. Los dos llevan a la conversación, igual que abrir un aviso de la bandeja.
 */
export function usePushNavigation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const open = (raw: unknown) =>
      void resolvePushDestination(queryClient, raw).then((destination) => destination && openDestination(destination));

    const url = new URL(window.location.href);
    const param = url.searchParams.get('push');
    if (param !== null) {
      // Se limpia ya: recargar no tiene que volver a navegar
      url.searchParams.delete('push');
      window.history.replaceState(window.history.state, '', url);
      try {
        open(JSON.parse(param));
      } catch {
        // Query param roto: se queda en el inicio
      }
    }

    if (!isPushSupported()) return;
    const sw = navigator.serviceWorker;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push-open') open(event.data.data);
    };
    sw.addEventListener('message', onMessage);
    return () => sw.removeEventListener('message', onMessage);
  }, [queryClient]);
}
