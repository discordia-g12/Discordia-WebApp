import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ConnectionState,
  DisconnectReason,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  Room,
  VideoTrack,
} from 'livekit-client';
import { joinVoiceChannel, leaveVoiceChannel } from '../api/voice';
import { DEFAULT_VOICE_PREFS, getVoicePlatform, type LiveKitModule } from '../voice/platform';

export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface VoiceRoomParticipant {
  /** Identidad en LiveKit: el user ID (sub de Auth0), el mismo que usa el resto de la app. */
  id: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  /** Track de la cámara si la tiene prendida; null si no (la interfaz muestra su foto o iniciales). */
  videoTrack: VideoTrack | null;
}

export interface VoiceJoinResult {
  /** false si no hubo acceso al micrófono: el usuario queda conectado pero silenciado. */
  microphoneAvailable: boolean;
}

/**
 * Por qué se cerró la sala sin que el usuario lo pidiera. removed: lo sacaron del canal (o se cerró la sala).
 * duplicate: entró al mismo canal desde otro dispositivo o pestaña. lost: corte de red o del servidor.
 */
export type VoiceDisconnectReason = 'removed' | 'duplicate' | 'lost';

export interface UseVoiceRoomOptions {
  /** Se llama cuando la sala se cierra sin que el usuario lo pida, con el motivo. */
  onUnexpectedDisconnect?: (reason: VoiceDisconnectReason) => void;
}

/** Texto para mostrar cuando la sala se cerró sin que el usuario lo pidiera. */
export function voiceDisconnectMessage(reason: VoiceDisconnectReason): string {
  switch (reason) {
    case 'removed':
      return 'Te sacaron del canal de voz';
    case 'duplicate':
      return 'Entraste al canal de voz desde otro dispositivo';
    default:
      return 'Se perdió la conexión con el canal de voz';
  }
}

function toDisconnectReason(reason: DisconnectReason | undefined, lk: LiveKitModule): VoiceDisconnectReason {
  const reasons = lk.DisconnectReason;
  if (!reasons || reason === undefined) return 'lost';
  if (reason === reasons.PARTICIPANT_REMOVED || reason === reasons.ROOM_DELETED) return 'removed';
  if (reason === reasons.DUPLICATE_IDENTITY) return 'duplicate';
  return 'lost';
}

/**
 * Cuánto sigue marcado como "hablando" alguien después de la última vez que LiveKit lo detectó.
 * LiveKit actualiza quién habla cada ~400 ms y en las pausas entre palabras lo desmarca: sin esta
 * retención el indicador parpadea en vez de quedarse mientras la persona habla.
 */
export const SPEAKING_HOLD_MS = 600;

function cameraTrackOf(participant: Participant, lk: LiveKitModule | null): VideoTrack | null {
  const source = lk?.Track.Source?.Camera;
  if (!source) return null;
  const publication = participant.getTrackPublication?.(source);
  // Una cámara apagada (mute) o todavía no recibida (remota sin suscribir) no tiene imagen que mostrar
  if (!publication?.track || publication.isMuted) return null;
  return publication.track as VideoTrack;
}

function toParticipant(participant: Participant, isLocal: boolean, lk: LiveKitModule | null): VoiceRoomParticipant {
  return {
    id: participant.identity,
    isLocal,
    isSpeaking: participant.isSpeaking,
    isMuted: !participant.isMicrophoneEnabled,
    videoTrack: cameraTrackOf(participant, lk),
  };
}

function toConnectionState(state: ConnectionState, lk: LiveKitModule): VoiceConnectionState {
  switch (state) {
    case lk.ConnectionState.Connected:
      return 'connected';
    case lk.ConnectionState.Connecting:
      return 'connecting';
    case lk.ConnectionState.Disconnected:
      return 'disconnected';
    default:
      return 'reconnecting';
  }
}

/**
 * Conexión a un canal de voz vía LiveKit (audio y cámara), igual en web y mobile; lo propio de cada
 * plataforma (cargar LiveKit, reproducir el audio, permisos, preferencias) lo aporta VoicePlatform.
 *
 * El voice-service firma el token y el cliente se conecta directo a LiveKit. Hay una sola sala
 * activa a la vez: unirse a otro canal cierra la anterior. Mute y deafen se pueden cambiar sin
 * estar conectado y se aplican al entrar.
 */
export function useVoiceRoom(options: UseVoiceRoomOptions = {}) {
  const [platform] = useState(getVoicePlatform);
  const [initialPrefs] = useState(() => platform.prefs?.load() ?? DEFAULT_VOICE_PREFS);
  // Siempre el callback del último render, sin re-registrar los eventos de la sala
  const onUnexpectedDisconnectRef = useRef(options.onUnexpectedDisconnect);
  onUnexpectedDisconnectRef.current = options.onUnexpectedDisconnect;
  const roomRef = useRef<Room | null>(null);
  // livekit-client, guardado al unirse (la plataforma puede cargarlo recién ahí)
  const livekitRef = useRef<LiveKitModule | null>(null);
  // Canal pedido más recientemente; permite descartar joins que quedaron viejos
  const channelIdRef = useRef<string | null>(null);
  const mutedRef = useRef(initialPrefs.muted);
  const deafenedRef = useRef(initialPrefs.deafened);
  const mutedBeforeDeafenRef = useRef(initialPrefs.mutedBeforeDeafen);
  const locallyMutedRef = useRef<Record<string, boolean>>({});
  const cameraOnRef = useRef(false);
  // Hasta cuándo sigue "hablando" cada participante (retención del indicador) y el timer que lo apaga
  const speakingUntilRef = useRef<Record<string, number>>({});
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncParticipantsRef = useRef<() => void>(() => undefined);

  const [channelId, setChannelId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>('disconnected');
  const [participants, setParticipants] = useState<VoiceRoomParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(initialPrefs.muted);
  const [isDeafened, setIsDeafened] = useState(initialPrefs.deafened);
  const [locallyMutedUsers, setLocallyMutedUsers] = useState<Record<string, boolean>>({});
  const [isCameraOn, setIsCameraOn] = useState(false);

  const syncParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setParticipants([]);
      return;
    }
    const lk = livekitRef.current;
    const now = Date.now();
    const until = speakingUntilRef.current;
    let nextExpiry = Infinity;

    const withHold = (participant: VoiceRoomParticipant, heard: boolean): VoiceRoomParticipant => {
      // Si no lo escuchás (ensordecido, silenciado para vos) o tiene el micrófono apagado, se apaga ya
      if (!heard || participant.isMuted) {
        delete until[participant.id];
        return { ...participant, isSpeaking: false };
      }
      if (participant.isSpeaking) until[participant.id] = now + SPEAKING_HOLD_MS;
      const held = (until[participant.id] ?? 0) > now;
      if (held) nextExpiry = Math.min(nextExpiry, until[participant.id]);
      return { ...participant, isSpeaking: held };
    };

    setParticipants([
      withHold(toParticipant(room.localParticipant, true, lk), true),
      ...Array.from(room.remoteParticipants.values()).map((p) => {
        const participant = toParticipant(p, false, lk);
        const heard = !deafenedRef.current && !locallyMutedRef.current[participant.id];
        return withHold(participant, heard);
      }),
    ]);

    // Volver a calcular cuando venza la próxima retención (para apagar el indicador)
    clearTimeout(speakingTimerRef.current);
    if (nextExpiry !== Infinity) {
      speakingTimerRef.current = setTimeout(() => syncParticipantsRef.current(), nextExpiry - now + 1);
    }
  }, []);
  syncParticipantsRef.current = syncParticipants;

  const applyVolume = useCallback((participant: RemoteParticipant) => {
    const silenced = deafenedRef.current || locallyMutedRef.current[participant.identity];
    participant.setVolume(silenced ? 0 : 1);
  }, []);

  const applyVolumes = useCallback(() => {
    roomRef.current?.remoteParticipants.forEach(applyVolume);
  }, [applyVolume]);

  const disconnectRoom = useCallback(
    async (room: Room) => {
      room.removeAllListeners();
      platform.stopAllRemoteAudio?.();
      await room.disconnect();
      await platform.stopAudioSession?.().catch(() => undefined);
    },
    [platform]
  );

  const resetState = useCallback(() => {
    roomRef.current = null;
    channelIdRef.current = null;
    setChannelId(null);
    setConnectionState('disconnected');
    setParticipants([]);
    clearTimeout(speakingTimerRef.current);
    speakingUntilRef.current = {};
    // La cámara arranca apagada en cada llamada
    cameraOnRef.current = false;
    setIsCameraOn(false);
  }, []);

  const bindRoomEvents = useCallback(
    (room: Room, lk: LiveKitModule) => {
      const { RoomEvent, Track } = lk;
      const syncIfCurrent = () => {
        if (roomRef.current === room) syncParticipants();
      };

      room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) platform.playRemoteAudio?.(track);
          applyVolume(participant);
          syncIfCurrent();
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          platform.stopRemoteAudio?.(track);
          syncIfCurrent();
        })
        .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          applyVolume(participant);
          syncIfCurrent();
        })
        .on(RoomEvent.ParticipantDisconnected, syncIfCurrent)
        .on(RoomEvent.ActiveSpeakersChanged, syncIfCurrent)
        .on(RoomEvent.TrackMuted, syncIfCurrent)
        .on(RoomEvent.TrackUnmuted, syncIfCurrent)
        .on(RoomEvent.TrackPublished, syncIfCurrent)
        .on(RoomEvent.TrackUnpublished, syncIfCurrent)
        .on(RoomEvent.LocalTrackPublished, syncIfCurrent)
        .on(RoomEvent.LocalTrackUnpublished, syncIfCurrent)
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          if (roomRef.current === room) setConnectionState(toConnectionState(state, lk));
        })
        .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
          // Desconexión no pedida por el usuario (red, servidor, lo sacaron): limpiar y avisar al backend
          if (roomRef.current !== room) return;
          disconnectRoom(room);
          resetState();
          leaveVoiceChannel().catch((err) => console.error('[Voice] Error al salir del canal:', err));
          onUnexpectedDisconnectRef.current?.(toDisconnectReason(reason, lk));
        });
    },
    [applyVolume, disconnectRoom, platform, resetState, syncParticipants]
  );

  const join = useCallback(
    async (targetChannelId: string): Promise<VoiceJoinResult> => {
      if (platform.isSupported?.() === false) {
        throw new Error(platform.unsupportedMessage ?? 'La voz no está disponible en este dispositivo.');
      }
      if (channelIdRef.current === targetChannelId) {
        return { microphoneAvailable: true };
      }

      const previous = roomRef.current;
      roomRef.current = null;
      channelIdRef.current = targetChannelId;
      setChannelId(targetChannelId);
      setConnectionState('connecting');
      setParticipants([]);
      if (previous) await disconnectRoom(previous);

      const isSuperseded = () => channelIdRef.current !== targetChannelId;
      let room: Room | null = null;

      try {
        const { token, url } = await joinVoiceChannel(targetChannelId);
        if (isSuperseded()) return { microphoneAvailable: true };

        const lk = await platform.livekit();
        livekitRef.current = lk;
        if (isSuperseded()) return { microphoneAvailable: true };
        await platform.startAudioSession?.();

        // adaptiveStream: cada video se recibe a la resolución en que se muestra (y se pausa si no se ve);
        // dynacast: no se envía una calidad de la cámara propia que nadie esté mirando
        room = new lk.Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;
        bindRoomEvents(room, lk);
        await room.connect(url, token);
        if (isSuperseded()) return { microphoneAvailable: true };

        await platform.afterConnect?.(room);

        let microphoneAvailable = platform.requestMicrophonePermission
          ? await platform.requestMicrophonePermission()
          : true;
        if (microphoneAvailable) {
          try {
            await room.localParticipant.setMicrophoneEnabled(!mutedRef.current);
          } catch (err) {
            console.error('[Voice] No se pudo acceder al micrófono:', err);
            microphoneAvailable = false;
          }
        }
        if (!microphoneAvailable) {
          mutedRef.current = true;
          setIsMuted(true);
        }

        setConnectionState('connected');
        syncParticipants();
        return { microphoneAvailable };
      } catch (err) {
        if (isSuperseded()) return { microphoneAvailable: true };
        if (room) await disconnectRoom(room);
        resetState();
        throw err;
      }
    },
    [bindRoomEvents, disconnectRoom, platform, resetState, syncParticipants]
  );

  const leave = useCallback(async () => {
    const room = roomRef.current;
    const wasInChannel = channelIdRef.current !== null;
    resetState();
    if (room) await disconnectRoom(room);
    if (wasInChannel) {
      await leaveVoiceChannel().catch((err) => console.error('[Voice] Error al salir del canal:', err));
    }
  }, [disconnectRoom, resetState]);

  const setMuted = useCallback(
    async (muted: boolean) => {
      mutedRef.current = muted;
      setIsMuted(muted);
      const room = roomRef.current;
      const lk = livekitRef.current;
      if (!room || !lk || room.state !== lk.ConnectionState.Connected) return;
      try {
        await room.localParticipant.setMicrophoneEnabled(!muted);
      } catch (err) {
        console.error('[Voice] No se pudo acceder al micrófono:', err);
        mutedRef.current = true;
        setIsMuted(true);
      }
      syncParticipants();
    },
    [platform, syncParticipants]
  );

  const setDeafened = useCallback(
    (deafened: boolean) => {
      deafenedRef.current = deafened;
      setIsDeafened(deafened);
      applyVolumes();
      syncParticipants();
    },
    [applyVolumes, syncParticipants]
  );

  // Solo se guardan los cambios hechos por el usuario (no un mute forzado por falta de permiso)
  const persistPrefs = useCallback(() => {
    platform.prefs?.save({
      muted: mutedRef.current,
      deafened: deafenedRef.current,
      mutedBeforeDeafen: mutedBeforeDeafenRef.current,
    });
  }, [platform]);

  const toggleMute = useCallback(() => {
    // Como en Discord: activar el micrófono estando ensordecido también reactiva el audio
    if (deafenedRef.current) {
      setDeafened(false);
      setMuted(false);
    } else {
      setMuted(!mutedRef.current);
    }
    persistPrefs();
  }, [persistPrefs, setDeafened, setMuted]);

  const toggleDeafen = useCallback(() => {
    if (deafenedRef.current) {
      setDeafened(false);
      setMuted(mutedBeforeDeafenRef.current);
    } else {
      mutedBeforeDeafenRef.current = mutedRef.current;
      setDeafened(true);
      setMuted(true);
    }
    persistPrefs();
  }, [persistPrefs, setDeafened, setMuted]);

  /**
   * Silencia o reactiva a un participante solo para este cliente (los demás lo siguen escuchando).
   * Se puede usar antes de entrar al canal: se aplica cuando el participante aparece.
   */
  const toggleLocalMute = useCallback(
    (userId: string) => {
      const next = { ...locallyMutedRef.current, [userId]: !locallyMutedRef.current[userId] };
      locallyMutedRef.current = next;
      setLocallyMutedUsers(next);
      const participant = roomRef.current?.remoteParticipants.get(userId);
      if (participant) applyVolume(participant);
      syncParticipants();
    },
    [applyVolume, syncParticipants]
  );

  /**
   * Prende o apaga la cámara propia (solo estando conectado). Apagarla no corta el audio.
   * Devuelve false si no se pudo prender (sin permiso o sin cámara).
   */
  const toggleCamera = useCallback(async (): Promise<boolean> => {
    const room = roomRef.current;
    const lk = livekitRef.current;
    if (!room || !lk || room.state !== lk.ConnectionState.Connected) return false;

    const next = !cameraOnRef.current;
    if (next && platform.requestCameraPermission && !(await platform.requestCameraPermission())) {
      return false;
    }
    try {
      await room.localParticipant.setCameraEnabled(next);
      cameraOnRef.current = next;
      setIsCameraOn(next);
      syncParticipants();
      return true;
    } catch (err) {
      console.error('[Voice] No se pudo usar la cámara:', err);
      return false;
    }
  }, [platform, syncParticipants]);

  // Al desmontar (p. ej. logout) cerrar la sala y avisar al backend
  useEffect(() => {
    return () => {
      const room = roomRef.current;
      const wasInChannel = channelIdRef.current !== null;
      roomRef.current = null;
      channelIdRef.current = null;
      clearTimeout(speakingTimerRef.current);
      if (room) disconnectRoom(room);
      if (wasInChannel) leaveVoiceChannel().catch(() => undefined);
    };
  }, [disconnectRoom]);

  return {
    channelId,
    connectionState,
    participants,
    isMuted,
    isDeafened,
    isCameraOn,
    locallyMutedUsers,
    join,
    leave,
    toggleMute,
    toggleDeafen,
    toggleLocalMute,
    toggleCamera,
  };
}
