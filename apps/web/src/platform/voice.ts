import type { Room } from 'livekit-client';
import { createVoicePrefsStore, refreshVoiceVolumes, setVoicePlatform } from '@discordia/core';
import { getPreferences, usePreferences } from '../app/preferences';
import { canChooseAudioOutput } from '../features/voice/audioDevices';

// Elementos <audio> de los participantes remotos: el browser no reproduce el audio de LiveKit solo
const audioElements = new Set<HTMLMediaElement>();

// La sala conectada, para cambiar de micrófono en medio de una llamada (Ajustes → Voz)
let activeRoom: Room | null = null;

type SinkElement = HTMLMediaElement & { setSinkId?: (sinkId: string) => Promise<void> };

/**
 * Parlantes de Ajustes → Voz en un elemento de audio de la llamada. El volumen no se toca acá: lo pone la
 * sala (outputVolume, abajo), que es la que sabe a quién silenciaste.
 */
function applyOutputDevice(el: HTMLMediaElement) {
  const { outputDeviceId } = getPreferences();
  const sink = el as SinkElement;
  if (canChooseAudioOutput() && sink.setSinkId) {
    sink.setSinkId(outputDeviceId === 'default' ? '' : outputDeviceId).catch(() => undefined);
  }
}

// Cambiar los ajustes con una llamada en curso se aplica enseguida, sin volver a entrar
usePreferences.subscribe((state, previous) => {
  if (state.outputVolume !== previous.outputVolume) refreshVoiceVolumes();
  if (state.outputDeviceId !== previous.outputDeviceId) audioElements.forEach(applyOutputDevice);
  // ConnectionState.Connected sin importar livekit-client (se carga recién al entrar a una llamada)
  if (state.inputDeviceId !== previous.inputDeviceId && activeRoom && (activeRoom.state as string) === 'connected') {
    activeRoom.switchActiveDevice('audioinput', state.inputDeviceId).catch(() => undefined);
  }
});

/**
 * Voz en el browser: la sala es la de @discordia/core (useVoiceRoom); acá va lo propio del DOM.
 */
setVoicePlatform({
  // Se carga recién al entrar a un canal de voz: es lo más pesado del bundle
  livekit: () => import('livekit-client'),

  // El micrófono elegido en Ajustes → Voz ('default' es el del sistema)
  roomOptions: () => ({ audioCaptureDefaults: { deviceId: getPreferences().inputDeviceId } }),
  // Volumen de los demás (Ajustes → Voz); la sala lo multiplica con el silencio de deafen y de "silenciar"
  outputVolume: () => getPreferences().outputVolume / 100,

  // Política de autoplay: el audio arranca recién con un gesto del usuario (el click de unirse)
  afterConnect: (room) => {
    activeRoom = room;
    return room.startAudio().catch(() => undefined);
  },

  playRemoteAudio(track) {
    const el = track.attach();
    audioElements.add(el);
    applyOutputDevice(el);
    document.body.appendChild(el);
  },

  stopRemoteAudio(track) {
    track.detach().forEach((el) => {
      audioElements.delete(el);
      el.remove();
    });
  },

  stopAllRemoteAudio() {
    audioElements.forEach((el) => el.remove());
    audioElements.clear();
  },

  // Mute y deafen se recuerdan para la próxima visita. localStorage se lee recién al usarlo: en
  // algunos contextos (storage bloqueado) solo nombrarlo ya lanza un error.
  prefs: createVoicePrefsStore({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  }),
});
