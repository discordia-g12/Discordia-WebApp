import { useCallback, useEffect, useRef, useState } from 'react';

/** Un micrófono o parlante para los selectores de Ajustes → Voz. */
export interface AudioDevice {
  id: string;
  label: string;
}

/** Primera opción de cada lista: el que tenga elegido el sistema (sigue al que se conecte después). */
export const SYSTEM_DEVICE: AudioDevice = { id: 'default', label: 'El del sistema' };

/** ¿El navegador deja elegir los parlantes? (Safari y Firefox, por ahora, no). */
export const canChooseAudioOutput = () =>
  typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;

const mediaDevices = (): MediaDevices | null =>
  typeof navigator !== 'undefined' && navigator.mediaDevices ? navigator.mediaDevices : null;

/**
 * Los micrófonos y parlantes de este dispositivo. Hasta que el sitio tiene permiso de micrófono el
 * navegador no dice los nombres (`needsPermission`): `requestAccess` lo pide y vuelve a leer la lista.
 * Se actualiza sola al conectar o desconectar algo.
 */
export function useAudioDevices() {
  const [inputs, setInputs] = useState<AudioDevice[]>([SYSTEM_DEVICE]);
  const [outputs, setOutputs] = useState<AudioDevice[]>([SYSTEM_DEVICE]);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = Boolean(mediaDevices()?.enumerateDevices);

  const refresh = useCallback(async () => {
    const devices = mediaDevices();
    if (!devices?.enumerateDevices) return;
    try {
      const list = await devices.enumerateDevices();
      // 'default' y 'communications' son alias de Chrome de otro de la lista: ya está "El del sistema"
      const real = list.filter((d) => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications');
      const named = (kind: MediaDeviceKind, fallback: string) =>
        real.filter((d) => d.kind === kind).map((d, i) => ({ id: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
      setInputs([SYSTEM_DEVICE, ...named('audioinput', 'Micrófono')]);
      setOutputs([SYSTEM_DEVICE, ...named('audiooutput', 'Parlante')]);
      setNeedsPermission(list.some((d) => d.kind === 'audioinput' && !d.label));
    } catch {
      setError('No se pudo leer la lista de dispositivos.');
    }
  }, []);

  useEffect(() => {
    const devices = mediaDevices();
    if (!devices) return;
    void refresh();
    devices.addEventListener?.('devicechange', refresh);
    return () => devices.removeEventListener?.('devicechange', refresh);
  }, [refresh]);

  const requestAccess = async () => {
    setError(null);
    try {
      const stream = await mediaDevices()!.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await refresh();
    } catch {
      setError('Sin permiso de micrófono el navegador no muestra los nombres de los dispositivos.');
    }
  };

  return { supported, inputs, outputs, needsPermission, error, requestAccess };
}

/** El elegido, si sigue conectado; si no, "El del sistema" (no se borra: vuelve a andar al reconectarlo). */
export function selectedDevice(devices: AudioDevice[], id: string): string {
  return devices.some((d) => d.id === id) ? id : SYSTEM_DEVICE.id;
}

type AudioContextCtor = typeof AudioContext;

/** Nivel de 0 a 100 a partir del RMS de la señal: la raíz hace que la voz normal quede a mitad de la barra. */
export function levelFromRms(rms: number): number {
  return Math.min(100, Math.round(Math.sqrt(Math.max(0, rms)) * 140));
}

/**
 * Prueba de micrófono: abre el micrófono elegido y mide el nivel en vivo (Web Audio), sin mandar nada a
 * ningún lado. Se corta al detenerla, al salir de la pantalla o al cambiar de micrófono (vuelve a abrir
 * el nuevo).
 */
export function useMicrophoneTest(deviceId: string) {
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setLevel(0);
  }, []);

  useEffect(() => {
    if (!testing) return;
    let cancelled = false;

    (async () => {
      setError(null);
      const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      const devices = mediaDevices();
      if (!Ctor || !devices?.getUserMedia) {
        setError('Este navegador no permite probar el micrófono.');
        setTesting(false);
        return;
      }

      let stream: MediaStream;
      try {
        stream = await devices.getUserMedia({
          audio: deviceId === SYSTEM_DEVICE.id ? true : { deviceId: { exact: deviceId } },
        });
      } catch {
        setError('No se pudo abrir el micrófono: revisá el permiso del sitio o elegí otro.');
        setTesting(false);
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const ctx = new Ctor();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let frame = 0;

      const tick = () => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const s of samples) sum += s * s;
        setLevel(levelFromRms(Math.sqrt(sum / samples.length)));
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);

      stopRef.current = () => {
        cancelAnimationFrame(frame);
        stream.getTracks().forEach((track) => track.stop());
        ctx.close().catch(() => undefined);
      };
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [testing, deviceId, stop]);

  return { testing, level, error, toggle: () => setTesting((t) => !t) };
}
