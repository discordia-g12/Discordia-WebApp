import { useEffect } from 'react';

export type RingKind = 'incoming' | 'outgoing';

/** Tonos del timbre: [frecuencia en Hz, inicio y duración en s] dentro de cada ciclo. */
const PATTERNS: Record<RingKind, { every: number; volume: number; tones: [number, number, number][] }> = {
  // Entrante: dos toques cortos cada 2 s
  incoming: { every: 2000, volume: 0.18, tones: [[880, 0, 0.35], [660, 0.45, 0.35]] },
  // Llamando: un tono largo y bajo cada 3 s, más suave (es para quien ya sabe que llamó)
  outgoing: { every: 3000, volume: 0.08, tones: [[440, 0, 1]] },
};

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Timbre de la llamada, sintetizado con Web Audio (sin archivos). Si el navegador bloquea el audio sin
 * interacción previa (autoplay), el contexto queda suspendido y no suena nada: no es un error. Lo que se
 * programó con el contexto suspendido no se acumula, porque cada ciclo solo suena si está corriendo.
 */
export function useRingtone(kind: RingKind | null) {
  useEffect(() => {
    if (!kind) return;
    const Ctor = audioContextCtor();
    if (!Ctor) return;
    let ctx: AudioContext;
    try {
      ctx = new Ctor();
    } catch {
      return;
    }
    const { every, volume, tones } = PATTERNS[kind];

    const ring = () => {
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;
      for (const [frequency, start, duration] of tones) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        // Entrada y salida cortas: sin el chasquido de cortar la onda de golpe
        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(volume, now + start + 0.02);
        gain.gain.setValueAtTime(volume, now + start + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, now + start + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration);
      }
    };

    ctx
      .resume()
      .then(ring)
      .catch(() => undefined);
    const timer = setInterval(ring, every);
    return () => {
      clearInterval(timer);
      ctx.close().catch(() => undefined);
    };
  }, [kind]);
}

/** Cambia el título de la pestaña mientras `title` no sea null; al terminar, vuelve el que estaba. */
export function useTabTitle(title: string | null) {
  useEffect(() => {
    if (title === null || typeof document === 'undefined') return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
