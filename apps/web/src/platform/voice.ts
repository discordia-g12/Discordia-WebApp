import { createVoicePrefsStore, setVoicePlatform } from '@discordia/core';

// Elementos <audio> de los participantes remotos: el browser no reproduce el audio de LiveKit solo
const audioElements = new Set<HTMLMediaElement>();

/**
 * Voz en el browser: la sala es la de @discordia/core (useVoiceRoom); acá va lo propio del DOM.
 */
setVoicePlatform({
  // Se carga recién al entrar a un canal de voz: es lo más pesado del bundle
  livekit: () => import('livekit-client'),

  // Política de autoplay: el audio arranca recién con un gesto del usuario (el click de unirse)
  afterConnect: (room) => room.startAudio().catch(() => undefined),

  playRemoteAudio(track) {
    const el = track.attach();
    audioElements.add(el);
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
