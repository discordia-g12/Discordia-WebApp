import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVoiceRoom, SPEAKING_HOLD_MS } from '../useVoiceRoom';
import { createVoicePrefsStore, setVoicePlatform, type LiveKitModule } from '../../voice/platform';

const mockJoinVoiceChannel = vi.fn();
const mockLeaveVoiceChannel = vi.fn();

vi.mock('../../api/voice', () => ({
  joinVoiceChannel: (...args: unknown[]) => mockJoinVoiceChannel(...args),
  leaveVoiceChannel: (...args: unknown[]) => mockLeaveVoiceChannel(...args),
}));

class FakeParticipant {
  isSpeaking = false;
  isMicrophoneEnabled = false;
  setVolume = vi.fn();
  // Publicación de la cámara: { track, isMuted } o nada si no la publicó
  cameraPublication: { track: object; isMuted: boolean } | undefined;
  getTrackPublication = vi.fn((source: string) => (source === 'camera' ? this.cameraPublication : undefined));
  constructor(public identity: string) {}
}

class FakeLocalParticipant extends FakeParticipant {
  setMicrophoneEnabled = vi.fn(async (enabled: boolean) => {
    if (FakeRoom.micDenied) throw new Error('NotAllowedError');
    this.isMicrophoneEnabled = enabled;
  });
  setCameraEnabled = vi.fn(async (enabled: boolean) => {
    if (FakeRoom.cameraDenied) throw new Error('NotAllowedError');
    this.cameraPublication = enabled ? { track: { kind: 'video', sid: 'local-cam' }, isMuted: false } : undefined;
  });
}

class FakeRoom {
  static instances: FakeRoom[] = [];
  static micDenied = false;
  static cameraDenied = false;

  state = 'disconnected';
  localParticipant = new FakeLocalParticipant('me');
  remoteParticipants = new Map<string, FakeParticipant>();
  listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  connect = vi.fn(async () => {
    this.state = 'connected';
  });
  disconnect = vi.fn(async () => {
    this.state = 'disconnected';
  });
  startAudio = vi.fn(async () => undefined);

  constructor() {
    FakeRoom.instances.push(this);
  }

  on(event: string, cb: (...args: unknown[]) => void) {
    (this.listeners[event] ||= []).push(cb);
    return this;
  }

  removeAllListeners() {
    this.listeners = {};
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    (this.listeners[event] || []).forEach((cb) => cb(...args));
  }

  addRemote(identity: string) {
    const participant = new FakeParticipant(identity);
    participant.isMicrophoneEnabled = true;
    this.remoteParticipants.set(identity, participant);
    this.emit('participantConnected', participant);
    return participant;
  }
}

// livekit-client falso: la sala lo recibe de la plataforma (en la web, el import del paquete real)
const fakeLiveKit = {
  Room: vi.fn(function () {
    return new FakeRoom();
  }),
  RoomEvent: {
    TrackSubscribed: 'trackSubscribed',
    TrackUnsubscribed: 'trackUnsubscribed',
    ParticipantConnected: 'participantConnected',
    ParticipantDisconnected: 'participantDisconnected',
    ActiveSpeakersChanged: 'activeSpeakersChanged',
    TrackMuted: 'trackMuted',
    TrackUnmuted: 'trackUnmuted',
    TrackPublished: 'trackPublished',
    TrackUnpublished: 'trackUnpublished',
    LocalTrackPublished: 'localTrackPublished',
    LocalTrackUnpublished: 'localTrackUnpublished',
    ConnectionStateChanged: 'connectionStateChanged',
    Disconnected: 'disconnected',
  },
  ConnectionState: {
    Disconnected: 'disconnected',
    Connecting: 'connecting',
    Connected: 'connected',
    Reconnecting: 'reconnecting',
    SignalReconnecting: 'signalReconnecting',
  },
  Track: { Kind: { Audio: 'audio', Video: 'video' }, Source: { Camera: 'camera', Microphone: 'microphone' } },
} as unknown as LiveKitModule;

/** Plataforma como la web: startAudio al conectar y preferencias en localStorage. */
function registerWebLikePlatform() {
  setVoicePlatform({
    livekit: () => fakeLiveKit,
    afterConnect: (room) => room.startAudio().catch(() => undefined),
    prefs: createVoicePrefsStore(localStorage),
  });
}

describe('useVoiceRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeRoom.instances = [];
    FakeRoom.micDenied = false;
    FakeRoom.cameraDenied = false;
    localStorage.clear();
    registerWebLikePlatform();
    mockJoinVoiceChannel.mockResolvedValue({ token: 'lk-token', url: 'ws://livekit.test' });
    mockLeaveVoiceChannel.mockResolvedValue(undefined);
  });

  it('se une al canal: pide el token, conecta a LiveKit y activa el micrófono', async () => {
    const { result } = renderHook(() => useVoiceRoom());

    let joinResult;
    await act(async () => {
      joinResult = await result.current.join('chan-1');
    });

    expect(mockJoinVoiceChannel).toHaveBeenCalledWith('chan-1');
    const room = FakeRoom.instances[0];
    expect(room.connect).toHaveBeenCalledWith('ws://livekit.test', 'lk-token');
    expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(joinResult).toEqual({ microphoneAvailable: true });
    expect(result.current.channelId).toBe('chan-1');
    expect(result.current.connectionState).toBe('connected');
    expect(result.current.participants).toEqual([
      { id: 'me', isLocal: true, isSpeaking: false, isMuted: false, videoTrack: null },
    ]);
  });

  it('no vuelve a unirse si ya está en ese canal', async () => {
    const { result } = renderHook(() => useVoiceRoom());

    await act(async () => {
      await Promise.all([result.current.join('chan-1'), result.current.join('chan-1')]);
    });

    expect(mockJoinVoiceChannel).toHaveBeenCalledTimes(1);
    expect(FakeRoom.instances).toHaveLength(1);
  });

  it('al cambiar de canal cierra la sala anterior', async () => {
    const { result } = renderHook(() => useVoiceRoom());

    await act(async () => {
      await result.current.join('chan-1');
    });
    await act(async () => {
      await result.current.join('chan-2');
    });

    expect(FakeRoom.instances[0].disconnect).toHaveBeenCalled();
    expect(FakeRoom.instances).toHaveLength(2);
    expect(result.current.channelId).toBe('chan-2');
  });

  it('si el backend rechaza el join, vuelve a desconectado y propaga el error', async () => {
    mockJoinVoiceChannel.mockRejectedValue(new Error('403'));
    const { result } = renderHook(() => useVoiceRoom());

    await act(async () => {
      await expect(result.current.join('chan-1')).rejects.toThrow('403');
    });

    expect(result.current.channelId).toBeNull();
    expect(result.current.connectionState).toBe('disconnected');
    expect(FakeRoom.instances).toHaveLength(0);
  });

  it('si no hay permiso de micrófono queda conectado pero silenciado', async () => {
    FakeRoom.micDenied = true;
    const { result } = renderHook(() => useVoiceRoom());

    let joinResult;
    await act(async () => {
      joinResult = await result.current.join('chan-1');
    });

    expect(joinResult).toEqual({ microphoneAvailable: false });
    expect(result.current.connectionState).toBe('connected');
    expect(result.current.isMuted).toBe(true);
  });

  it('respeta el mute elegido antes de conectarse', async () => {
    const { result } = renderHook(() => useVoiceRoom());

    act(() => {
      result.current.toggleMute();
    });
    await act(async () => {
      await result.current.join('chan-1');
    });

    expect(FakeRoom.instances[0].localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(false);
    expect(result.current.isMuted).toBe(true);
  });

  it('agrega participantes remotos cuando entran a la sala', async () => {
    const { result } = renderHook(() => useVoiceRoom());
    await act(async () => {
      await result.current.join('chan-1');
    });

    act(() => {
      FakeRoom.instances[0].addRemote('auth0|otro');
    });

    expect(result.current.participants.map((p) => p.id)).toEqual(['me', 'auth0|otro']);
  });

  it('deafen silencia a todos y al micrófono; al desactivarlo restaura el estado previo', async () => {
    const { result } = renderHook(() => useVoiceRoom());
    await act(async () => {
      await result.current.join('chan-1');
    });
    const remote = FakeRoom.instances[0].addRemote('auth0|otro');

    await act(async () => {
      result.current.toggleDeafen();
    });
    expect(result.current.isDeafened).toBe(true);
    expect(result.current.isMuted).toBe(true);
    expect(remote.setVolume).toHaveBeenLastCalledWith(0);

    await act(async () => {
      result.current.toggleDeafen();
    });
    expect(result.current.isDeafened).toBe(false);
    expect(result.current.isMuted).toBe(false);
    expect(remote.setVolume).toHaveBeenLastCalledWith(1);
  });

  it('silenciar localmente solo afecta a ese participante', async () => {
    const { result } = renderHook(() => useVoiceRoom());
    await act(async () => {
      await result.current.join('chan-1');
    });
    const remote = FakeRoom.instances[0].addRemote('auth0|otro');

    act(() => {
      result.current.toggleLocalMute('auth0|otro');
    });

    expect(remote.setVolume).toHaveBeenLastCalledWith(0);
    expect(result.current.locallyMutedUsers).toEqual({ 'auth0|otro': true });
  });

  it('un participante silenciado para mí no aparece como hablando', async () => {
    const { result } = renderHook(() => useVoiceRoom());
    await act(async () => {
      await result.current.join('chan-1');
    });
    const remote = FakeRoom.instances[0].addRemote('auth0|otro');
    remote.isSpeaking = true;
    act(() => FakeRoom.instances[0].emit('activeSpeakersChanged'));
    expect(result.current.participants.find((p) => p.id === 'auth0|otro')?.isSpeaking).toBe(true);

    act(() => result.current.toggleLocalMute('auth0|otro'));
    expect(result.current.participants.find((p) => p.id === 'auth0|otro')?.isSpeaking).toBe(false);

    // Sigue hablando para LiveKit, pero para mí no
    act(() => FakeRoom.instances[0].emit('activeSpeakersChanged'));
    expect(result.current.participants.find((p) => p.id === 'auth0|otro')?.isSpeaking).toBe(false);

    act(() => result.current.toggleLocalMute('auth0|otro'));
    expect(result.current.participants.find((p) => p.id === 'auth0|otro')?.isSpeaking).toBe(true);
  });

  it('ensordecido, nadie aparece como hablando', async () => {
    const { result } = renderHook(() => useVoiceRoom());
    await act(async () => {
      await result.current.join('chan-1');
    });
    const remote = FakeRoom.instances[0].addRemote('auth0|otro');
    remote.isSpeaking = true;
    act(() => FakeRoom.instances[0].emit('activeSpeakersChanged'));
    expect(result.current.participants.find((p) => p.id === 'auth0|otro')?.isSpeaking).toBe(true);

    await act(async () => {
      result.current.toggleDeafen();
    });
    expect(result.current.participants.find((p) => p.id === 'auth0|otro')?.isSpeaking).toBe(false);

    await act(async () => {
      result.current.toggleDeafen();
    });
    expect(result.current.participants.find((p) => p.id === 'auth0|otro')?.isSpeaking).toBe(true);
  });

  describe('retención del indicador de quién habla', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    const setup = async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useVoiceRoom());
      await act(async () => {
        await result.current.join('chan-1');
      });
      let remote!: FakeParticipant;
      act(() => {
        remote = FakeRoom.instances[0].addRemote('auth0|otro');
      });
      const other = () => result.current.participants.find((p) => p.id === 'auth0|otro')!;
      const speak = (speaking: boolean) =>
        act(() => {
          remote.isSpeaking = speaking;
          FakeRoom.instances[0].emit('activeSpeakersChanged');
        });
      return { result, remote, other, speak };
    };

    it('se mantiene en las pausas cortas entre palabras', async () => {
      const { other, speak } = await setup();
      speak(true);
      expect(other().isSpeaking).toBe(true);

      // Pausa corta: LiveKit lo desmarca, pero el indicador sigue
      speak(false);
      act(() => vi.advanceTimersByTime(SPEAKING_HOLD_MS / 2));
      expect(other().isSpeaking).toBe(true);

      // Vuelve a hablar antes de que venza: sigue sin cortes
      speak(true);
      speak(false);
      act(() => vi.advanceTimersByTime(SPEAKING_HOLD_MS / 2));
      expect(other().isSpeaking).toBe(true);
    });

    it('se apaga después del tiempo de retención sin hablar', async () => {
      const { other, speak } = await setup();
      speak(true);
      speak(false);
      act(() => vi.advanceTimersByTime(SPEAKING_HOLD_MS + 10));
      expect(other().isSpeaking).toBe(false);
    });

    it('se corta al instante si apaga el micrófono', async () => {
      const { other, remote, speak } = await setup();
      speak(true);
      act(() => {
        remote.isMicrophoneEnabled = false;
        FakeRoom.instances[0].emit('trackMuted');
      });
      expect(other().isSpeaking).toBe(false);
    });

    it('se corta al instante si lo silenciás para vos', async () => {
      const { result, other, speak } = await setup();
      speak(true);
      act(() => result.current.toggleLocalMute('auth0|otro'));
      expect(other().isSpeaking).toBe(false);
    });
  });

  describe('cámara', () => {
    const join = async (result: { current: ReturnType<typeof useVoiceRoom> }) => {
      await act(async () => {
        await result.current.join('chan-1');
      });
    };
    const me = (result: { current: ReturnType<typeof useVoiceRoom> }) =>
      result.current.participants.find((p) => p.isLocal)!;

    it('arranca apagada y se prende y apaga sin tocar el micrófono', async () => {
      const { result } = renderHook(() => useVoiceRoom());
      await join(result);
      expect(result.current.isCameraOn).toBe(false);
      expect(me(result).videoTrack).toBeNull();

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.toggleCamera();
      });
      expect(ok).toBe(true);
      expect(result.current.isCameraOn).toBe(true);
      expect(me(result).videoTrack).toEqual({ kind: 'video', sid: 'local-cam' });

      await act(async () => {
        await result.current.toggleCamera();
      });
      expect(result.current.isCameraOn).toBe(false);
      expect(me(result).videoTrack).toBeNull();
      // CA 2: apagar la cámara no corta el audio
      expect(me(result).isMuted).toBe(false);
    });

    it('si no hay permiso de cámara sigue apagada y devuelve false', async () => {
      FakeRoom.cameraDenied = true;
      const { result } = renderHook(() => useVoiceRoom());
      await join(result);

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.toggleCamera();
      });
      expect(ok).toBe(false);
      expect(result.current.isCameraOn).toBe(false);
    });

    it('respeta el permiso de cámara de la plataforma (Android)', async () => {
      setVoicePlatform({ livekit: () => fakeLiveKit, requestCameraPermission: async () => false });
      const { result } = renderHook(() => useVoiceRoom());
      await join(result);

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.toggleCamera();
      });
      expect(ok).toBe(false);
      expect(FakeRoom.instances[0].localParticipant.setCameraEnabled).not.toHaveBeenCalled();
    });

    it('no hace nada fuera de una llamada', async () => {
      const { result } = renderHook(() => useVoiceRoom());
      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.toggleCamera();
      });
      expect(ok).toBe(false);
      expect(result.current.isCameraOn).toBe(false);
    });

    it('muestra la cámara de otro participante y la oculta si la apaga', async () => {
      const { result } = renderHook(() => useVoiceRoom());
      await join(result);
      let remote!: FakeParticipant;
      act(() => {
        remote = FakeRoom.instances[0].addRemote('auth0|otro');
      });
      const other = () => result.current.participants.find((p) => p.id === 'auth0|otro')!;
      expect(other().videoTrack).toBeNull();

      remote.cameraPublication = { track: { kind: 'video', sid: 'remote-cam' }, isMuted: false };
      act(() => FakeRoom.instances[0].emit('trackSubscribed', { kind: 'video' }, {}, remote));
      expect(other().videoTrack).toEqual({ kind: 'video', sid: 'remote-cam' });

      remote.cameraPublication = { track: { kind: 'video', sid: 'remote-cam' }, isMuted: true };
      act(() => FakeRoom.instances[0].emit('trackMuted'));
      expect(other().videoTrack).toBeNull();
    });

    it('al salir de la llamada la cámara queda apagada', async () => {
      const { result } = renderHook(() => useVoiceRoom());
      await join(result);
      await act(async () => {
        await result.current.toggleCamera();
      });
      await act(async () => {
        await result.current.leave();
      });
      expect(result.current.isCameraOn).toBe(false);
    });

    it('la sala usa adaptiveStream y dynacast', async () => {
      const { result } = renderHook(() => useVoiceRoom());
      await join(result);
      expect(fakeLiveKit.Room).toHaveBeenCalledWith({ adaptiveStream: true, dynacast: true });
    });
  });

  it('leave cierra la sala y avisa al backend', async () => {
    const { result } = renderHook(() => useVoiceRoom());
    await act(async () => {
      await result.current.join('chan-1');
    });

    await act(async () => {
      await result.current.leave();
    });

    expect(FakeRoom.instances[0].disconnect).toHaveBeenCalled();
    expect(mockLeaveVoiceChannel).toHaveBeenCalled();
    expect(result.current.channelId).toBeNull();
    expect(result.current.connectionState).toBe('disconnected');
    expect(result.current.participants).toEqual([]);
  });

  it('si LiveKit corta la conexión, limpia el estado y avisa al backend', async () => {
    const { result } = renderHook(() => useVoiceRoom());
    await act(async () => {
      await result.current.join('chan-1');
    });

    await act(async () => {
      FakeRoom.instances[0].emit('disconnected');
    });

    expect(result.current.channelId).toBeNull();
    expect(mockLeaveVoiceChannel).toHaveBeenCalled();
  });

  it('avisa con onUnexpectedDisconnect solo si el corte no lo pidió el usuario', async () => {
    const onUnexpectedDisconnect = vi.fn();
    const { result } = renderHook(() => useVoiceRoom({ onUnexpectedDisconnect }));

    await act(async () => {
      await result.current.join('chan-1');
    });
    await act(async () => {
      await result.current.leave();
    });
    expect(onUnexpectedDisconnect).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.join('chan-2');
    });
    await act(async () => {
      FakeRoom.instances[1].emit('disconnected');
    });
    expect(onUnexpectedDisconnect).toHaveBeenCalledTimes(1);
  });

  it('al desmontar cierra la sala y avisa al backend', async () => {
    const { result, unmount } = renderHook(() => useVoiceRoom());
    await act(async () => {
      await result.current.join('chan-1');
    });

    unmount();

    expect(FakeRoom.instances[0].disconnect).toHaveBeenCalled();
    expect(mockLeaveVoiceChannel).toHaveBeenCalled();
  });

  describe('preferencias de audio', () => {
    it('guarda mute y deafen en localStorage', () => {
      const { result } = renderHook(() => useVoiceRoom());

      act(() => {
        result.current.toggleDeafen();
      });

      expect(JSON.parse(localStorage.getItem('discordia_voice_prefs')!)).toEqual({
        muted: true,
        deafened: true,
        mutedBeforeDeafen: false,
      });
    });

    it('arranca con la preferencia guardada y la aplica al conectarse', async () => {
      localStorage.setItem(
        'discordia_voice_prefs',
        JSON.stringify({ muted: true, deafened: false, mutedBeforeDeafen: false })
      );
      const { result } = renderHook(() => useVoiceRoom());

      expect(result.current.isMuted).toBe(true);
      await act(async () => {
        await result.current.join('chan-1');
      });
      expect(FakeRoom.instances[0].localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(false);
    });

    it('al desensordecer restaura el micrófono guardado antes del deafen', () => {
      localStorage.setItem(
        'discordia_voice_prefs',
        JSON.stringify({ muted: true, deafened: true, mutedBeforeDeafen: false })
      );
      const { result } = renderHook(() => useVoiceRoom());

      act(() => {
        result.current.toggleDeafen();
      });

      expect(result.current.isDeafened).toBe(false);
      expect(result.current.isMuted).toBe(false);
    });

    it('no guarda el mute forzado por falta de permiso de micrófono', async () => {
      FakeRoom.micDenied = true;
      const { result } = renderHook(() => useVoiceRoom());

      await act(async () => {
        await result.current.join('chan-1');
      });

      expect(result.current.isMuted).toBe(true);
      expect(localStorage.getItem('discordia_voice_prefs')).toBeNull();
    });

    it('ignora datos corruptos en localStorage', () => {
      localStorage.setItem('discordia_voice_prefs', '{no es json');
      const { result } = renderHook(() => useVoiceRoom());

      expect(result.current.isMuted).toBe(false);
      expect(result.current.isDeafened).toBe(false);
    });
  });

  describe('plataforma mobile', () => {
    function registerMobileLikePlatform(overrides: Partial<Parameters<typeof setVoicePlatform>[0]> = {}) {
      const platform = {
        livekit: () => fakeLiveKit,
        startAudioSession: vi.fn(async () => undefined),
        stopAudioSession: vi.fn(async () => undefined),
        requestMicrophonePermission: vi.fn(async () => true),
        ...overrides,
      };
      setVoicePlatform(platform);
      return platform;
    }

    it('abre la sesión de audio antes de conectar y la cierra al salir', async () => {
      const platform = registerMobileLikePlatform();
      const { result } = renderHook(() => useVoiceRoom());

      await act(async () => {
        await result.current.join('chan-1');
      });
      expect(platform.startAudioSession).toHaveBeenCalledTimes(1);
      expect(FakeRoom.instances[0].startAudio).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.leave();
      });
      expect(platform.stopAudioSession).toHaveBeenCalledTimes(1);
    });

    it('sin permiso de micrófono (Android) entra silenciado sin intentar abrirlo', async () => {
      registerMobileLikePlatform({ requestMicrophonePermission: vi.fn(async () => false) });
      const { result } = renderHook(() => useVoiceRoom());

      let joinResult;
      await act(async () => {
        joinResult = await result.current.join('chan-1');
      });

      expect(joinResult).toEqual({ microphoneAvailable: false });
      expect(FakeRoom.instances[0].localParticipant.setMicrophoneEnabled).not.toHaveBeenCalled();
      expect(result.current.isMuted).toBe(true);
      expect(result.current.connectionState).toBe('connected');
    });

    it('sin soporte de voz (Expo Go) el join falla sin pedir token', async () => {
      registerMobileLikePlatform({ isSupported: () => false, unsupportedMessage: 'Sin voz en Expo Go' });
      const { result } = renderHook(() => useVoiceRoom());

      await act(async () => {
        await expect(result.current.join('chan-1')).rejects.toThrow('Sin voz en Expo Go');
      });
      expect(mockJoinVoiceChannel).not.toHaveBeenCalled();
      expect(result.current.channelId).toBeNull();
    });
  });
});
