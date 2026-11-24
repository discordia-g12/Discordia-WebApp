import { useEffect } from 'react';
import { startInactivityTimer } from '@discordia/core';

/** Lo que cuenta como usar la app. Con la pestaña oculta no llega ninguno: a los 5 minutos queda inactivo. */
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'focus'] as const;

/** pointermove llega decenas de veces por segundo: alcanza con mirarlo cada tanto. */
const ACTIVITY_THROTTLE_MS = 5_000;

/**
 * Con sesión, avisa a Chat-Engine (por el inbox) si el usuario dejó de usar la app: quien eligió "Conectado"
 * se ve "Ausente" hasta que vuelve.
 */
export function useInactivity(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const timer = startInactivityTimer();
    let last = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - last < ACTIVITY_THROTTLE_MS) return;
      last = now;
      timer.activity();
    };

    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, onActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, onActivity));
      timer.stop();
    };
  }, [enabled]);
}
