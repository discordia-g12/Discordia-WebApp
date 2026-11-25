import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ConnectionState,
  DisconnectReason,
  LocalTrack,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  Room,
  Track,
  VideoTrack,
} from 'livekit-client';
import {
  joinVoiceChannel,
  leaveVoiceChannel,
  type VoiceJoinResponse,
  type VoicePublishPermissions,
} from '../api/voice';
import { DEFAULT_VOICE_PREFS, getVoicePlatform, onVoiceVolumeRefresh, type LiveKitModule } from '../voice/platform';

export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface VoiceRoomParticipant {
  /** Identidad en LiveKit: el user ID (sub de Auth0), el mismo que usa el resto de la app. */
  id: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  /** Track de la cámara si la tiene prendida; null si no (la interfaz muestra su foto o iniciales). */
  videoTrack: VideoTrack | null;
  /** Track de la pantalla compartida si la está transmitiendo; null si no. */
  screenShareTrack: VideoTrack | null;
}

/** Fuera de una llamada (y si el voice-service no informa permisos) se puede publicar todo. */
const PUBLISH_ALL: VoicePublishPermissions = { canSpeak: true, canVideo: true, canScreenShare: true };

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
  /**
   * Se llama cuando la sala de un canal de servidor se cierra sin que el usuario lo pida, con el motivo. Una
   * sala propia (join con `credentials`) avisa por su `onLeave`, no acá.
   */
  onUnexpectedDisconnect?: (reason: VoiceDisconnectReason) => void;
}

/**
 * Sala que no es un canal de servidor (una llamada privada): quien la usa trae las credenciales y su salida.
 * Sin opciones, `join` es un canal de servidor (joinVoiceChannel / leaveVoiceChannel).
 */
export interface VoiceJoinOptions {
  /** Token y URL de LiveKit para esta sala. */
  credentials?: () => Promise<VoiceJoinResponse>;
  /**
   * Avisar al backend que se salió, una sola vez por sala: al llamar a leave, al pasar a otra sala, al
   * desmontar, o si la sala se cerró sola (`reason` viene solo en este último caso).
   */
  onLeave?: (reason?: VoiceDisconnectReason) => Promise<void>;
}

/** La sala pedida más recientemente. `own`: con credenciales propias (no es un canal de servidor). */
interface RoomTarget {
  id: string;
  own: boolean;
  onLeave?: VoiceJoinOptions['onLeave'];
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

/** La salida de la sala `target` en el backend: la propia, o leaveVoiceChannel si es un canal. */
function notifyLeave(target: RoomTarget, reason?: VoiceDisconnectReason): Promise<void> {
  const leaving = target.own
    ? (target.onLeave?.(reason) ?? Promise.resolve())
    : leaveVoiceChannel();
  return leaving.catch((err) => console.error('[Voice] Error al salir de la sala:', err));
}

/**
 * Cuánto sigue marcado como "hablando" alguien después de la última vez que LiveKit lo detectó.
 * LiveKit actualiza quién habla cada ~400 ms y en las pausas entre palabras lo desmarca: sin esta
 * retención el indicador parpadea en vez de quedarse mientras la persona habla.
 */
export const SPEAKING_HOLD_MS = 600;

function videoTrackOf(participant: Participant, source: Track.Source | undefined): VideoTrack | null {
  if (!source) return null;
  const publication = participant.getTrackPublication?.(source);
  // Una cámara o pantalla apagada (mute) o todavía no recibida (remota sin suscribir) no tiene imagen que mostrar
  if (!publication?.track || publication.isMuted) return null;
  return publication.track as VideoTrack;
}

async function unpublishScreenShare(room: Room, lk: LiveKitModule): Promise<void> {
  const sources = [lk.Track.Source?.ScreenShare, lk.Track.Source?.ScreenShareAudio].filter(
    (source): source is Track.Source => Boolean(source)
  );
  await Promise.all(
    sources.map(async (source) => {
      const track = room.localParticipant.getTrackPublication?.(source)?.track;
      if (track) await room.localParticipant.unpublishTrack(track);
    })
  );
}

function toParticipant(participant: Participant, isLocal: boolean, lk: LiveKitModule | null): VoiceRoomParticipant {
  return {
    id: participant.identity,
    isLocal,
    isSpeaking: participant.isSpeaking,
    isMuted: !participant.isMicrophoneEnabled,
    videoTrack: videoTrackOf(participant, lk?.Track.Source?.Camera),
    screenShareTrack: videoTrackOf(participant, lk?.Track.Source?.ScreenShare),
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
 * activa a la vez: unirse a otro canal (o a una llamada, con credenciales propias) cierra la anterior. Mute
 * y deafen se pueden cambiar sin estar conectado y se aplican al entrar.
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
  // Sala pedida más recientemente; permite descartar joins que quedaron viejos
  const targetRef = useRef<RoomTarget | null>(null);
  const mutedRef = useRef(initialPrefs.muted);
  const deafenedRef = useRef(initialPrefs.deafened);
  const mutedBeforeDeafenRef = useRef(initialPrefs.mutedBeforeDeafen);
  const locallyMutedRef = useRef<Record<string, boolean>>({});
  const cameraOnRef = useRef(false);
  const screenShareOnRef = useRef(false);
  // Qué permiten publicar los roles en la llamada actual (lo informa el join)
  const publishRef = useRef<VoicePublishPermissions>(PUBLISH_ALL);
  // Sala con un cambio de cámara en curso (permiso, crear o publicar el track): se ignoran los toques que lleguen mientras
  const cameraBusyRoomRef = useRef<Room | null>(null);
  // Sala con un cambio de pantalla compartida en curso: evita aperturas duplicadas del selector nativo
  const screenShareBusyRoomRef = useRef<Room | null>(null);
  // Hasta cuándo sigue "hablando" cada participante (retención del indicador) y el timer que lo apaga
  const speakingUntilRef = useRef<Record<string, number>>({});
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncParticipantsRef = useRef<() => void>(() => undefined);

  const [target, setTarget] = useState<RoomTarget | null>(null);
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>('disconnected');
  const [participants, setParticipants] = useState<VoiceRoomParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(initialPrefs.muted);
  const [isDeafened, setIsDeafened] = useState(initialPrefs.deafened);
  const [locallyMutedUsers, setLocallyMutedUsers] = useState<Record<string, boolean>>({});
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenShareOn, setIsScreenShareOn] = useState(false);
  const [publishPermissions, setPublishPermissions] = useState<VoicePublishPermissions>(PUBLISH_ALL);

  const applyVolume = useCallback((participant: RemoteParticipant) => {
    const silenced = deafenedRef.current || locallyMutedRef.current[participant.identity];
    const output = Math.min(1, Math.max(0, platform.outputVolume?.() ?? 1));
    const volume = silenced ? 0 : output;
    // Silenciar también el audio de la pantalla compartida antes del micrófono por defecto
    const screenAudio = livekitRef.current?.Track.Source?.ScreenShareAudio;
    if (screenAudio) participant.setVolume(volume, screenAudio);
    participant.setVolume(volume);
  }, [platform]);

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
        // El volumen se vuelve a aplicar en cada cambio de la sala: si alguien silenciado (para mí o
        // por deafen) prende el micrófono, su audio nuevo llega con volumen 0 sin depender del orden
        // en que LiveKit crea el track y emite los eventos
        applyVolume(p);
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
  }, [applyVolume]);
  syncParticipantsRef.current = syncParticipants;

  const applyVolumes = useCallback(() => {
    roomRef.current?.remoteParticipants.forEach(applyVolume);
  }, [applyVolume]);

  // El volumen de salida de la plataforma cambió (web: Ajustes → Voz): se aplica sin volver a entrar
  useEffect(() => onVoiceVolumeRefresh(applyVolumes), [applyVolumes]);

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
    targetRef.current = null;
    setTarget(null);
    setConnectionState('disconnected');
    setParticipants([]);
    clearTimeout(speakingTimerRef.current);
    speakingUntilRef.current = {};
    // La cámara y la pantalla compartida arrancan apagadas en cada llamada
    cameraOnRef.current = false;
    setIsCameraOn(false);
    screenShareOnRef.current = false;
    setIsScreenShareOn(false);
    publishRef.current = PUBLISH_ALL;
    setPublishPermissions(PUBLISH_ALL);
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
          // Solo el audio: el <video> de una cámara lo crea y lo saca la UI (en la web, React)
          if (track.kind === Track.Kind.Audio) platform.stopRemoteAudio?.(track);
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
        .on(RoomEvent.LocalTrackUnpublished, () => {
          if (roomRef.current !== room) return;
          // Si el usuario detuvo la transmisión desde la barra del sistema/navegador, reflejarlo en el estado
          const screenSource = lk.Track.Source?.ScreenShare;
          const stillSharing = screenSource
            ? Boolean(room.localParticipant.getTrackPublication?.(screenSource)?.track)
            : false;
          if (screenShareOnRef.current && !stillSharing) {
            screenShareOnRef.current = false;
            setIsScreenShareOn(false);
          }
          syncIfCurrent();
        })
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          if (roomRef.current === room) setConnectionState(toConnectionState(state, lk));
        })
        .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
          // Desconexión no pedida por el usuario (red, servidor, lo sacaron): limpiar y avisar al backend
          if (roomRef.current !== room) return;
          const closed = targetRef.current;
          disconnectRoom(room);
          resetState();
          const disconnectReason = toDisconnectReason(reason, lk);
          if (!closed) return;
          notifyLeave(closed, disconnectReason);
          // Una sala propia (llamada) la cierra su dueño: no es "te sacaron del canal"
          if (!closed.own) onUnexpectedDisconnectRef.current?.(disconnectReason);
        });
    },
    [applyVolume, disconnectRoom, platform, resetState, syncParticipants]
  );

  /**
   * Entra a una sala. Sin `opts`, a un canal de servidor. Con `opts.credentials`, a una sala propia (una
   * llamada privada). Si ya estaba en otra, la cierra: entre canales el backend mueve al usuario solo; si
   * alguna de las dos es propia, se avisa la salida de la anterior (onLeave o leaveVoiceChannel).
   */
  const join = useCallback(
    async (roomId: string, opts: VoiceJoinOptions = {}): Promise<VoiceJoinResult> => {
      if (platform.isSupported?.() === false) {
        throw new Error(platform.unsupportedMessage ?? 'La voz no está disponible en este dispositivo.');
      }
      if (targetRef.current?.id === roomId) {
        return { microphoneAvailable: true };
      }

      const own = Boolean(opts.credentials);
      const next: RoomTarget = { id: roomId, own, onLeave: opts.onLeave };
      const previous = roomRef.current;
      const previousTarget = targetRef.current;
      roomRef.current = null;
      targetRef.current = next;
      setTarget(next);
      setConnectionState('connecting');
      setParticipants([]);
      // Al cerrar la sala anterior se cierran cámara y pantalla: en la nueva arrancan apagadas
      cameraOnRef.current = false;
      setIsCameraOn(false);
      screenShareOnRef.current = false;
      setIsScreenShareOn(false);
      clearTimeout(speakingTimerRef.current);
      speakingUntilRef.current = {};
      if (previous) await disconnectRoom(previous);
      if (previousTarget && (previousTarget.own || own)) notifyLeave(previousTarget);

      const isSuperseded = () => targetRef.current !== next;
      let room: Room | null = null;

      try {
        const { token, url, permissions } = opts.credentials
          ? await opts.credentials()
          : await joinVoiceChannel(roomId);
        if (isSuperseded()) return { microphoneAvailable: true };
        publishRef.current = permissions ?? PUBLISH_ALL;
        setPublishPermissions(publishRef.current);

        const lk = await platform.livekit();
        livekitRef.current = lk;
        if (isSuperseded()) return { microphoneAvailable: true };
        await platform.startAudioSession?.();

        // adaptiveStream: cada video se recibe a la resolución en que se muestra (y se pausa si no se ve);
        // dynacast: no se envía una calidad de la cámara propia que nadie esté mirando
        room = new lk.Room({ adaptiveStream: true, dynacast: true, ...platform.roomOptions?.() });
        roomRef.current = room;
        bindRoomEvents(room, lk);
        await room.connect(url, token);
        if (isSuperseded()) return { microphoneAvailable: true };

        await platform.afterConnect?.(room);

        // Sin permiso para hablar no se pide el micrófono: el token no deja publicarlo
        let microphoneAvailable = !publishRef.current.canSpeak
          ? true
          : platform.requestMicrophonePermission
            ? await platform.requestMicrophonePermission()
            : true;
        if (microphoneAvailable && publishRef.current.canSpeak) {
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
    const left = targetRef.current;
    resetState();
    if (room) await disconnectRoom(room);
    if (left) await notifyLeave(left);
  }, [disconnectRoom, resetState]);

  const setMuted = useCallback(
    async (muted: boolean) => {
      mutedRef.current = muted;
      setIsMuted(muted);
      const room = roomRef.current;
      const lk = livekitRef.current;
      if (!room || !lk || room.state !== lk.ConnectionState.Connected) return;
      // Sin permiso para hablar el micrófono queda apagado; se guarda la preferencia para la próxima llamada
      if (!publishRef.current.canSpeak) return;
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
    // Sin permiso para hablar no hay micrófono que activar (la interfaz deshabilita el botón)
    if (!publishRef.current.canSpeak) return;
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
   * Devuelve false si no se pudo prender (sin permiso o sin cámara). Un toque mientras hay otro
   * cambio en curso, o que termina después de salir de la sala, se descarta y devuelve true (no hubo error).
   */
  const toggleCamera = useCallback(async (): Promise<boolean> => {
    const room = roomRef.current;
    const lk = livekitRef.current;
    if (!room || !lk || room.state !== lk.ConnectionState.Connected) return false;
    if (cameraBusyRoomRef.current === room) return true;

    const next = !cameraOnRef.current;
    // Sin permiso de video el token no deja publicar la cámara (la interfaz deshabilita el botón)
    if (next && !publishRef.current.canVideo) return false;

    cameraBusyRoomRef.current = room;
    const isCurrent = () => roomRef.current === room;
    try {
      if (next && platform.requestCameraPermission && !(await platform.requestCameraPermission())) {
        return !isCurrent();
      }
      // Se colgó o se cambió de canal mientras se pedía el permiso
      if (!isCurrent()) return true;
      if (next) {
        // El track se crea acá y no con setCameraEnabled: en la web el permiso lo pide el navegador
        // al crearlo, y si mientras tanto se salió de la sala hay que apagarlo en vez de publicarlo
        const track = await lk.createLocalVideoTrack();
        if (!isCurrent()) {
          track.stop();
          return true;
        }
        try {
          await room.localParticipant.publishTrack(track);
        } catch (err) {
          track.stop();
          throw err;
        }
        if (!isCurrent()) {
          track.stop();
          return true;
        }
      } else {
        // Despublicar (no solo silenciar) libera la cámara; prenderla de nuevo crea un track nuevo
        const track = room.localParticipant.getTrackPublication(lk.Track.Source.Camera)?.track;
        if (track) await room.localParticipant.unpublishTrack(track);
      }
      cameraOnRef.current = next;
      setIsCameraOn(next);
      syncParticipants();
      return true;
    } catch (err) {
      if (!isCurrent()) return true;
      console.error('[Voice] No se pudo usar la cámara:', err);
      return false;
    } finally {
      if (cameraBusyRoomRef.current === room) cameraBusyRoomRef.current = null;
    }
  }, [platform, syncParticipants]);

  /**
   * Inicia o detiene compartir pantalla (solo estando conectado y con permiso SCREEN_SHARE).
   * Apagarla no corta el micrófono ni la cámara. Devuelve false si no hay permiso o el usuario
   * cancela el selector nativo.
   */
  const toggleScreenShare = useCallback(async (): Promise<boolean> => {
    const room = roomRef.current;
    const lk = livekitRef.current;
    if (!room || !lk || room.state !== lk.ConnectionState.Connected) return false;
    if (screenShareBusyRoomRef.current === room) return true;

    const next = !screenShareOnRef.current;
    if (next && !publishRef.current.canScreenShare) return false;

    screenShareBusyRoomRef.current = room;
    const isCurrent = () => roomRef.current === room;
    try {
      if (next) {
        const tracks = await lk.createLocalScreenTracks({ audio: true });
        if (!isCurrent()) {
          tracks.forEach((t) => t.stop());
          return true;
        }
        const published: LocalTrack[] = [];
        try {
          for (const track of tracks) {
            await room.localParticipant.publishTrack(track);
            published.push(track);
          }
        } catch (err) {
          tracks.forEach((t) => t.stop());
          await Promise.all(
            published.map((t) => room.localParticipant.unpublishTrack(t).catch(() => undefined))
          );
          throw err;
        }
        if (!isCurrent()) {
          tracks.forEach((t) => t.stop());
          return true;
        }

        const videoTrack = tracks.find((t) => t.kind === lk.Track.Kind.Video) ?? tracks[0];
        const mediaTrack = (videoTrack as { mediaStreamTrack?: MediaStreamTrack })?.mediaStreamTrack;
        mediaTrack?.addEventListener?.(
          'ended',
          () => {
            if (!isCurrent()) return;
            void unpublishScreenShare(room, lk).catch(() => undefined);
            if (screenShareOnRef.current) {
              screenShareOnRef.current = false;
              setIsScreenShareOn(false);
              syncParticipants();
            }
          },
          { once: true }
        );
      } else {
        await unpublishScreenShare(room, lk);
      }
      screenShareOnRef.current = next;
      setIsScreenShareOn(next);
      syncParticipants();
      return true;
    } catch (err) {
      if (!isCurrent()) return true;
      console.error('[Voice] No se pudo compartir la pantalla:', err);
      return false;
    } finally {
      if (screenShareBusyRoomRef.current === room) screenShareBusyRoomRef.current = null;
    }
  }, [syncParticipants]);

  // Al desmontar (p. ej. logout) cerrar la sala y avisar al backend
  useEffect(() => {
    return () => {
      const room = roomRef.current;
      const left = targetRef.current;
      roomRef.current = null;
      targetRef.current = null;
      clearTimeout(speakingTimerRef.current);
      if (room) disconnectRoom(room);
      if (left) notifyLeave(left);
    };
  }, [disconnectRoom]);

  return {
    /** El canal de servidor en el que está (o al que está entrando); null si no hay sala o es una propia. */
    channelId: target && !target.own ? target.id : null,
    /** La sala actual, de cualquier tipo (canal o llamada, p. ej. `call-<id>`). */
    roomId: target?.id ?? null,
    connectionState,
    participants,
    // Sin permiso para hablar se muestra silenciado, aunque la preferencia guardada sea otra
    isMuted: isMuted || !publishPermissions.canSpeak,
    isDeafened,
    isCameraOn,
    isScreenShareOn,
    /** Lo que los roles dejan publicar en la llamada actual (en la interfaz, botones deshabilitados). */
    canSpeak: publishPermissions.canSpeak,
    canVideo: publishPermissions.canVideo,
    canScreenShare: publishPermissions.canScreenShare,
    locallyMutedUsers,
    join,
    leave,
    toggleMute,
    toggleDeafen,
    toggleLocalMute,
    toggleCamera,
    toggleScreenShare,
  };
}
