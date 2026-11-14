import { CALL_BUSY_MESSAGE, callEndMessage, type CallEndReason, type CallRole, type PrivateCallState, type VoiceConnectionState } from '@discordia/core'

/** Cuánto queda a la vista el aviso de cómo terminó, con la pantalla de la llamada abierta. */
export const CALL_ENDED_NOTICE_MS = 3_000

/** Vibración mientras suena: 1 s vibrando, 1 s de pausa (se repite hasta atender, rechazar o que deje de sonar). */
export const RINGING_VIBRATION = [0, 1_000, 1_000]

/** Primera letra en mayúscula: los textos de core van en minúscula y un toast es una oración. */
export function sentence(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text
}

/** Textos de core que hablan del otro ("no respondió"): llevan su nombre adelante. */
const ABOUT_THE_OTHER: ReadonlySet<string> = new Set(['no puede atender ahora', 'no respondió', CALL_BUSY_MESSAGE])

/** Un texto de callEndMessage / callErrorMessage como oración, con el nombre del otro si habla de él. */
export function callSentence(message: string, name: string): string {
  return ABOUT_THE_OTHER.has(message) ? `${name} ${message}` : sentence(message)
}

/** Cómo terminó, para quien la ve terminar (ver callEndMessage de core). */
export function callEndText(reason: CallEndReason, role: CallRole, name: string): string {
  return callSentence(callEndMessage(reason, role), name)
}

/** 0:42, 12:05, 1:02:09. */
export function formatCallDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

/**
 * La línea de estado de la pantalla de la llamada: llamando… mientras suena, conectando mientras entra a la
 * sala y la duración en curso. Con el mock de API no hay sala (la conexión queda en disconnected): la
 * llamada activa muestra la duración igual.
 */
export function callStatusLine(state: PrivateCallState, connection: VoiceConnectionState, now: number): string | null {
  switch (state.status) {
    case 'outgoing':
      return 'llamando…'
    case 'incoming':
      return state.accepting ? 'conectando' : 'te está llamando'
    case 'active': {
      if (connection === 'connecting') return 'conectando'
      if (connection === 'reconnecting') return 'reconectando'
      const answeredAt = Date.parse(state.call.answeredAt ?? state.call.createdAt)
      return formatCallDuration(Number.isNaN(answeredAt) ? 0 : now - answeredAt)
    }
    default:
      return null
  }
}

/** Hay una llamada en curso en este dispositivo (sonando o activa). */
export function isCallOpen(
  state: PrivateCallState,
): state is Extract<PrivateCallState, { status: 'outgoing' | 'incoming' | 'active' }> {
  return state.status === 'outgoing' || state.status === 'incoming' || state.status === 'active'
}
