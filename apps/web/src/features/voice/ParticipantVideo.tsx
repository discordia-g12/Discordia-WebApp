import { useEffect, useRef } from 'react';
import type { VideoTrack } from 'livekit-client';
import styles from './VoiceView.module.css';

interface ParticipantVideoProps {
  track: VideoTrack;
  /** La cámara propia se muestra en espejo, como en un espejo de verdad. */
  mirrored?: boolean;
}

/**
 * Cámara de un participante llenando su ficha. LiveKit maneja el elemento <video>: attach() lo
 * conecta al track (y, con adaptiveStream, ajusta la calidad recibida al tamaño de la ficha).
 */
export function ParticipantVideo({ track, mirrored = false }: ParticipantVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  // muted: el audio va por su propio track (el <audio> de la plataforma), no por el video
  return <video ref={ref} className={`${styles.video} ${mirrored ? styles.mirrored : ''}`} autoPlay playsInline muted />;
}
