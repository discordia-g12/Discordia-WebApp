import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVoiceRoom } from '../useVoiceRoom';
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
  constructor(public identity: string) {}
}

class FakeLocalParticipant extends FakeParticipant {
  setMicrophoneEnabled = vi.fn(async (enabled: boolean) => {
    if (FakeRoom.micDenied) throw new Error('NotAllowedError');
    this.isMicrophoneEnabled = enabled;
  });
}

class FakeRoom {
  static instances: FakeRoom[] = [];
  static micDenied = false;

  state = 'disconnected';
  localParticipant = new FakeLocalParticipant('me');
  remoteParticipants = new Map<string, FakeParticipant>();
  listeners: Record<string, ((...args: any[]) => void)[]> = {};

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

  on(event: string, cb: (...args: any[]) => void) {
    (this.listeners[event] ||= []).push(cb);
    return this;
  }

  removeAllListeners() {
    this.listeners = {};
    return this;
  }

  emit(event: string, ...args: any[]) {
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
  Track: { Kind: { Audio: 'audio', Video: 'video' } },
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
      { id: 'me', isLocal: true, isSpeaking: false, isMuted: false },
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
