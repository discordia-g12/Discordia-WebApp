import { createContext, useContext } from 'react';
import type { useVoiceRoom } from '@discordia/core';

interface VoiceContextValue {
  room: ReturnType<typeof useVoiceRoom>;
  /** Quién está en cada canal de voz del servidor seleccionado, en vivo. */
  presence: Record<string, string[]>;
  /** Entra a un canal de voz. Si ya está en otro, primero pide confirmación (salvo confirmed). */
  join: (channelId: string, options?: { confirmed?: boolean }) => Promise<void>;
  /** Sale del canal de voz y vuelve al chat. */
  disconnect: () => void;
  /** true si entrar a channelId implica salir de otro canal de voz. */
  isSwitching: (channelId: string) => boolean;
  /** Prende o apaga la cámara propia; avisa si el navegador no da acceso. */
  toggleCamera: () => Promise<void>;
  /** Inicia o detiene compartir pantalla; avisa si el navegador no da acceso o se cancela. */
  toggleScreenShare: () => Promise<void>;
}

export const VoiceContext = createContext<VoiceContextValue | null>(null);

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice debe usarse dentro de <VoiceProvider>');
  return ctx;
}
