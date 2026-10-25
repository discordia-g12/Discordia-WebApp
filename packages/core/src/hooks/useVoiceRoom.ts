import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionState, Participant, RemoteParticipant, RemoteTrack, Room } from 'livekit-client';
import { joinVoiceChannel, leaveVoiceChannel } from '../api/voice';
import { DEFAULT_VOICE_PREFS, getVoicePlatform, type LiveKitModule } from '../voice/platform';

export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface VoiceRoomParticipant {
  /** Identidad en LiveKit: el user ID (sub de Auth0), el mismo que usa el resto de la app. */
  id: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
}

export interface VoiceJoinResult {
  /** false si no hubo acceso al micrófono: el usuario queda conectado pero silenciado. */
  microphoneAvailable: boolean;
}

export interface UseVoiceRoomOptions {
  /** Se llama cuando la sala se cierra sin que el usuario lo pida (red, servidor LiveKit). */
  onUnexpectedDisconnect?: () => void;
}

function toParticipant(participant: Participant, isLocal: boolean): VoiceRoomParticipant {
  return {
    id: participant.identity,
    isLocal,
    isSpeaking: participant.isSpeaking,
    isMuted: !participant.isMicrophoneEnabled,
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
 * Conexión a un canal de voz vía LiveKit (solo audio), igual en web y mobile; lo propio de cada
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

  const [channelId, setChannelId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>('disconnected');
  const [participants, setParticipants] = useState<VoiceRoomParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(initialPrefs.muted);
  const [isDeafened, setIsDeafened] = useState(initialPrefs.deafened);
  const [locallyMutedUsers, setLocallyMutedUsers] = useState<Record<string, boolean>>({});

  const syncParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) {
      setParticipants([]);
      return;
    }
    setParticipants([
      toParticipant(room.localParticipant, true),
      ...Array.from(room.remoteParticipants.values()).map((p) => {
        const participant = toParticipant(p, false);
        // Si no lo estás escuchando (ensordecido o silenciado para vos), no se marca como hablando
        if (deafenedRef.current || locallyMutedRef.current[participant.id]) participant.isSpeaking = false;
        return participant;
      }),
    ]);
  }, []);

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
        .on(RoomEvent.Disconnected, () => {
          // Desconexión no pedida por el usuario (red, servidor): limpiar y avisar al backend
          if (roomRef.current !== room) return;
          disconnectRoom(room);
          resetState();
          leaveVoiceChannel().catch((err) => console.error('[Voice] Error al salir del canal:', err));
          onUnexpectedDisconnectRef.current?.();
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

        room = new lk.Room();
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

  // Al desmontar (p. ej. logout) cerrar la sala y avisar al backend
  useEffect(() => {
    return () => {
      const room = roomRef.current;
      const wasInChannel = channelIdRef.current !== null;
      roomRef.current = null;
      channelIdRef.current = null;
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
    locallyMutedUsers,
    join,
    leave,
    toggleMute,
    toggleDeafen,
    toggleLocalMute,
  };
}
