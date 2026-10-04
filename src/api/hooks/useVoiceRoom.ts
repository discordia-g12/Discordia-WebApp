import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConnectionState,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';
import { joinVoiceChannel, leaveVoiceChannel } from '../voice';

export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface VoiceRoomParticipant {
  /** Identidad en LiveKit: el user ID (sub de Auth0), el mismo que usa el resto de la app. */
  id: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
}

export interface VoiceJoinResult {
  /** false si el browser no dio acceso al micrófono: el usuario queda conectado pero silenciado. */
  microphoneAvailable: boolean;
}

export interface UseVoiceRoomOptions {
  /** Se llama cuando la sala se cierra sin que el usuario lo pida (red, servidor LiveKit). */
  onUnexpectedDisconnect?: () => void;
}

const PREFS_STORAGE_KEY = 'discordia_voice_prefs';

interface VoicePrefs {
  muted: boolean;
  deafened: boolean;
  /** Estado del micrófono antes de ensordecerse, para restaurarlo al reactivar el audio. */
  mutedBeforeDeafen: boolean;
}

const DEFAULT_PREFS: VoicePrefs = { muted: false, deafened: false, mutedBeforeDeafen: false };

function loadVoicePrefs(): VoicePrefs {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const data = JSON.parse(raw);
    return {
      muted: data.muted === true,
      deafened: data.deafened === true,
      mutedBeforeDeafen: data.mutedBeforeDeafen === true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function saveVoicePrefs(prefs: VoicePrefs) {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage bloqueado (modo privado, cuota): la preferencia dura solo esta sesión
  }
}

function toParticipant(participant: Participant, isLocal: boolean): VoiceRoomParticipant {
  return {
    id: participant.identity,
    isLocal,
    isSpeaking: participant.isSpeaking,
    isMuted: !participant.isMicrophoneEnabled,
  };
}

function toConnectionState(state: ConnectionState): VoiceConnectionState {
  switch (state) {
    case ConnectionState.Connected:
      return 'connected';
    case ConnectionState.Connecting:
      return 'connecting';
    case ConnectionState.Disconnected:
      return 'disconnected';
    default:
      return 'reconnecting';
  }
}

/**
 * Conexión a un canal de voz vía LiveKit (solo audio).
 *
 * El voice-service firma el token y el browser se conecta directo a LiveKit. Hay una sola sala
 * activa a la vez: unirse a otro canal cierra la anterior. Mute y deafen se pueden cambiar sin
 * estar conectado y se aplican al entrar; se guardan en localStorage para la próxima visita.
 */
export function useVoiceRoom(options: UseVoiceRoomOptions = {}) {
  const [initialPrefs] = useState(loadVoicePrefs);
  // Siempre el callback del último render, sin re-registrar los eventos de la sala
  const onUnexpectedDisconnectRef = useRef(options.onUnexpectedDisconnect);
  onUnexpectedDisconnectRef.current = options.onUnexpectedDisconnect;
  const roomRef = useRef<Room | null>(null);
  // Canal pedido más recientemente; permite descartar joins que quedaron viejos
  const channelIdRef = useRef<string | null>(null);
  const audioElementsRef = useRef(new Set<HTMLMediaElement>());
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
      ...Array.from(room.remoteParticipants.values()).map((p) => toParticipant(p, false)),
    ]);
  }, []);

  const applyVolume = useCallback((participant: RemoteParticipant) => {
    const silenced = deafenedRef.current || locallyMutedRef.current[participant.identity];
    participant.setVolume(silenced ? 0 : 1);
  }, []);

  const applyVolumes = useCallback(() => {
    roomRef.current?.remoteParticipants.forEach(applyVolume);
  }, [applyVolume]);

  const disconnectRoom = useCallback(async (room: Room) => {
    room.removeAllListeners();
    audioElementsRef.current.forEach((el) => el.remove());
    audioElementsRef.current.clear();
    await room.disconnect();
  }, []);

  const resetState = useCallback(() => {
    roomRef.current = null;
    channelIdRef.current = null;
    setChannelId(null);
    setConnectionState('disconnected');
    setParticipants([]);
  }, []);

  const bindRoomEvents = useCallback(
    (room: Room) => {
      const syncIfCurrent = () => {
        if (roomRef.current === room) syncParticipants();
      };

      room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub, participant: RemoteParticipant) => {
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            audioElementsRef.current.add(el);
            document.body.appendChild(el);
            applyVolume(participant);
          }
          syncIfCurrent();
        })
        .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          track.detach().forEach((el) => {
            audioElementsRef.current.delete(el);
            el.remove();
          });
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
          if (roomRef.current === room) setConnectionState(toConnectionState(state));
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
    [applyVolume, disconnectRoom, resetState, syncParticipants]
  );

  const join = useCallback(
    async (targetChannelId: string): Promise<VoiceJoinResult> => {
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

        room = new Room();
        roomRef.current = room;
        bindRoomEvents(room);
        await room.connect(url, token);
        if (isSuperseded()) return { microphoneAvailable: true };

        await room.startAudio().catch(() => undefined);

        let microphoneAvailable = true;
        try {
          await room.localParticipant.setMicrophoneEnabled(!mutedRef.current);
        } catch (err) {
          console.error('[Voice] No se pudo acceder al micrófono:', err);
          microphoneAvailable = false;
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
    [bindRoomEvents, disconnectRoom, resetState, syncParticipants]
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
      if (!room || room.state !== ConnectionState.Connected) return;
      try {
        await room.localParticipant.setMicrophoneEnabled(!muted);
      } catch (err) {
        console.error('[Voice] No se pudo acceder al micrófono:', err);
        mutedRef.current = true;
        setIsMuted(true);
      }
      syncParticipants();
    },
    [syncParticipants]
  );

  const setDeafened = useCallback(
    (deafened: boolean) => {
      deafenedRef.current = deafened;
      setIsDeafened(deafened);
      applyVolumes();
    },
    [applyVolumes]
  );

  // Solo se guardan los cambios hechos por el usuario (no un mute forzado por falta de permiso)
  const persistPrefs = useCallback(() => {
    saveVoicePrefs({
      muted: mutedRef.current,
      deafened: deafenedRef.current,
      mutedBeforeDeafen: mutedBeforeDeafenRef.current,
    });
  }, []);

  const toggleMute = useCallback(() => {
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

  /** Silencia o reactiva a un participante solo para este cliente. */
  const toggleLocalMute = useCallback(
    (userId: string) => {
      const next = { ...locallyMutedRef.current, [userId]: !locallyMutedRef.current[userId] };
      locallyMutedRef.current = next;
      setLocallyMutedUsers(next);
      const participant = roomRef.current?.remoteParticipants.get(userId);
      if (participant) applyVolume(participant);
    },
    [applyVolume]
  );

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
