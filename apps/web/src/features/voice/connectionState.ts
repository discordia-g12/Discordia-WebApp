/** Estado de la conexión con el servidor de voz, compartido por la vista de la llamada y los controles. */
export type VoiceViewConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** Estado de la conexión con barra final, como el resto del microcopy. */
export const CONNECTION_LABEL: Record<VoiceViewConnectionState, string> = {
  connected: 'conectado/',
  connecting: 'conectando/',
  reconnecting: 'reconectando/',
  disconnected: 'desconectado/',
};

/** Late solo mientras conecta o reconecta; desconectado es un estado quieto (y legible). */
export function isPending(state: VoiceViewConnectionState): boolean {
  return state === 'connecting' || state === 'reconnecting';
}
