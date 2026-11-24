import { useEffect, useState } from 'react';
import { usePushSettings, useVapidPublicKey } from '@discordia/core';
import { getPushSubscription, isPushSupported, subscribeToPush } from '../../../platform/push';

/**
 * El interruptor "Notificaciones push" de Ajustes. Prendido = el usuario tiene push (`pushEnabled`) y este
 * navegador está suscripto. Prender pide permiso (es el gesto del usuario), suscribe, registra y guarda
 * `pushEnabled`; apagar solo guarda `pushEnabled: false` (la suscripción queda para volver a prender).
 */
export function useWebPushToggle() {
  const { pushEnabled, setPushEnabled, isLoading, isSaving } = usePushSettings();
  const vapid = useVapidPublicKey();
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPushSubscription()
      .then((s) => setSubscribed(s !== null))
      .catch(() => setSubscribed(false));
  }, []);

  // Por qué no se puede prender, si no se puede
  let unavailable: string | null = null;
  if (!isPushSupported()) {
    unavailable = 'Este navegador no tiene notificaciones push. En iPhone y iPad hay que instalar Discordia en la pantalla de inicio.';
  } else if (vapid.isError || vapid.data === null) {
    unavailable = 'Las notificaciones push de la web no están disponibles por ahora.';
  } else if (Notification.permission === 'denied') {
    unavailable = 'Bloqueaste las notificaciones de Discordia: habilitalas en los permisos del sitio del navegador.';
  }

  const toggle = async (next: boolean) => {
    setError(null);
    setBusy(true);
    try {
      if (next) {
        if ((await subscribeToPush(vapid.data!)) === 'denied') {
          setError('Sin permiso del navegador no se pueden mostrar avisos.');
          return;
        }
        setSubscribed(true);
      }
      await setPushEnabled(next);
    } catch {
      setError(next ? 'No se pudieron activar las notificaciones push.' : 'No se pudo guardar el cambio.');
    } finally {
      setBusy(false);
    }
  };

  return {
    checked: unavailable === null && pushEnabled && subscribed,
    disabled: unavailable !== null || vapid.isPending || isLoading || isSaving || busy,
    unavailable,
    error,
    toggle,
  };
}
