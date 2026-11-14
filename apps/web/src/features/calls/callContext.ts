import { createContext, useContext } from 'react';
import type { PrivateCallState } from '@discordia/core';

export interface CallContextValue {
  /** Estado de la llamada privada en este dispositivo (la máquina de core). */
  state: PrivateCallState;
  /** El otro participante de la llamada actual (id de la conversación); null sin llamada o si no se conoce. */
  peerId: string | null;
  /**
   * Llama desde la conversación. Si está en un canal de voz de servidor, primero pide confirmación (llamar
   * lo saca del canal). Los errores se avisan con un toast.
   */
  call: (conversationId: string, peerName: string) => void;
  /** Atiende la entrante y abre el chat con quien llama. */
  accept: () => Promise<void>;
  decline: () => Promise<void>;
  /** Corta: cancela la que suena, termina la activa o rechaza la entrante. */
  hangUp: () => Promise<void>;
  /** Cierra el aviso de cómo terminó. */
  dismiss: () => void;
}

export const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall debe usarse dentro de <CallProvider>');
  return ctx;
}

/** true si hay una llamada abierta (sonando, entrante o activa). */
export function isCallOpen(
  state: PrivateCallState
): state is Extract<PrivateCallState, { status: 'outgoing' | 'incoming' | 'active' }> {
  return state.status === 'outgoing' || state.status === 'incoming' || state.status === 'active';
}

/** true si este dispositivo está (o entra) en la sala de la llamada: llamando o en llamada. */
export function isInCall(state: PrivateCallState): state is Extract<PrivateCallState, { status: 'outgoing' | 'active' }> {
  return state.status === 'outgoing' || state.status === 'active';
}
