import type { RemoteTrack, Room, RoomOptions } from 'livekit-client';

/**
 * Lo que cambia de la voz entre plataformas. La sala (useVoiceRoom) es la misma en web y mobile:
 * una sala a la vez, mute / deafen, silenciar a alguien solo para mí, desconexiones inesperadas.
 * Cada app registra su plataforma al arrancar con setVoicePlatform.
 */

/** Lo que la sala usa de livekit-client (la web lo importa; mobile lo carga solo si hay WebRTC nativo). */
export type LiveKitModule = Pick<
  typeof import('livekit-client'),
  'Room' | 'RoomEvent' | 'ConnectionState' | 'Track' | 'createLocalVideoTrack' | 'createLocalScreenTracks'
> &
  // Opcional: sin él, toda desconexión inesperada se informa como corte de conexión
  Partial<Pick<typeof import('livekit-client'), 'DisconnectReason'>>;

export interface VoicePrefs {
  muted: boolean;
  deafened: boolean;
  /** Estado del micrófono antes de ensordecerse, para restaurarlo al reactivar el audio. */
  mutedBeforeDeafen: boolean;
}

export interface VoicePrefsStore {
  load(): VoicePrefs;
  save(prefs: VoicePrefs): void;
}

export interface VoicePlatform {
  /**
   * livekit-client. Solo se llama al unirse a un canal: la web lo carga recién ahí (import() dinámico, el
   * paquete es pesado y la mayoría de las visitas no entra a una llamada).
   */
  livekit(): LiveKitModule | Promise<LiveKitModule>;

  /** false si la plataforma no puede hacer voz (Expo Go, sin WebRTC nativo). Default: true. */
  isSupported?(): boolean;
  /** Mensaje del error de join cuando isSupported() es false. */
  unsupportedMessage?: string;

  /** Antes de crear la sala (mobile: abrir la sesión de audio del teléfono, modo llamada). */
  startAudioSession?(): Promise<void>;
  /** Después de cerrar la sala (mobile: cerrar la sesión de audio). */
  stopAudioSession?(): Promise<void>;
  /** Recién conectada la sala (web: room.startAudio, por la política de autoplay del browser). */
  afterConnect?(room: Room): Promise<void>;
  /** Opciones extra de la sala al crearla (web: el micrófono elegido en Ajustes → Voz). */
  roomOptions?(): Partial<RoomOptions>;
  /**
   * Volumen de los demás, de 0 a 1 (web: Ajustes → Voz). Default: 1. Si cambia con una llamada en curso,
   * llamar a refreshVoiceVolumes(): la sala lo vuelve a aplicar sin tocar a quien está silenciado.
   */
  outputVolume?(): number;

  /**
   * Reproducir el audio de un participante remoto (web: un elemento <audio>). Sin estas funciones lo
   * reproduce LiveKit solo (mobile).
   */
  playRemoteAudio?(track: RemoteTrack): void;
  stopRemoteAudio?(track: RemoteTrack): void;
  stopAllRemoteAudio?(): void;

  /** Pedir permiso de micrófono antes de activarlo (Android). Default: concedido. */
  requestMicrophonePermission?(): Promise<boolean>;
  /** Pedir permiso de cámara antes de prenderla (Android). Default: concedido. */
  requestCameraPermission?(): Promise<boolean>;

  /** Dónde se recuerdan mute y deafen entre visitas. Sin store, arrancan en false. */
  prefs?: VoicePrefsStore;
}

let platform: VoicePlatform | null = null;

const volumeRefreshers = new Set<() => void>();

/** La sala montada se anota para volver a aplicar los volúmenes (useVoiceRoom). */
export function onVoiceVolumeRefresh(refresh: () => void): () => void {
  volumeRefreshers.add(refresh);
  return () => {
    volumeRefreshers.delete(refresh);
  };
}

/** Cambió outputVolume() de la plataforma: la sala en curso lo aplica enseguida. */
export function refreshVoiceVolumes(): void {
  volumeRefreshers.forEach((refresh) => refresh());
}

export function setVoicePlatform(voicePlatform: VoicePlatform): void {
  platform = voicePlatform;
}

export function getVoicePlatform(): VoicePlatform {
  if (!platform) {
    throw new Error('Voz sin plataforma: llamar a setVoicePlatform() al arrancar la app.');
  }
  return platform;
}

const PREFS_STORAGE_KEY = 'discordia_voice_prefs';

export const DEFAULT_VOICE_PREFS: VoicePrefs = { muted: false, deafened: false, mutedBeforeDeafen: false };

/** Preferencias guardadas en un storage síncrono tipo localStorage. */
export function createVoicePrefsStore(storage: Pick<Storage, 'getItem' | 'setItem'>): VoicePrefsStore {
  return {
    load() {
      try {
        const raw = storage.getItem(PREFS_STORAGE_KEY);
        if (!raw) return DEFAULT_VOICE_PREFS;
        const data = JSON.parse(raw);
        return {
          muted: data.muted === true,
          deafened: data.deafened === true,
          mutedBeforeDeafen: data.mutedBeforeDeafen === true,
        };
      } catch {
        return DEFAULT_VOICE_PREFS;
      }
    },
    save(prefs) {
      try {
        storage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
      } catch {
        // Storage bloqueado (modo privado, cuota): la preferencia dura solo esta sesión
      }
    },
  };
}
