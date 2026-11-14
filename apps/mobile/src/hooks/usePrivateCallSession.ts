import { useCallback, useEffect, useState } from 'react'
import { Vibration } from 'react-native'
import {
  ApiError,
  callErrorMessage,
  getApiMock,
  getVoicePlatform,
  useConversationsQuery,
  usePrivateCall,
  type PrivateCallState,
  type useVoiceRoom,
  type VoiceConnectionState,
} from '@discordia/core'
import { useUI } from '../providers/AppProviders'
import { CALL_ENDED_NOTICE_MS, RINGING_VIBRATION, callEndText, callSentence, callStatusLine, isCallOpen } from '../utils/call'
import { isVoiceSupported } from '../utils/voice'
import { useUserDisplay } from './useUserProfiles'

type VoiceRoom = ReturnType<typeof useVoiceRoom>

/** Llamada pedida estando en un canal de voz de servidor: espera la confirmación (llamar saca del canal). */
export interface PendingCall {
  conversationId: string
  name: string
}

/** Con quién es la llamada en curso: el otro de la conversación. */
export interface CallPeer {
  id: string | null
  name: string
  avatar: string | null
}

/**
 * Las llamadas se pueden usar: la app tiene WebRTC (development build), o la API es el mock, que no entra a
 * LiveKit y deja probar la llamada sin audio también en Expo Go.
 */
const callsSupported = () => isVoiceSupported || getApiMock() !== null

const unsupportedMessage = () => getVoicePlatform().unsupportedMessage ?? 'La voz no está disponible en este dispositivo'

/**
 * La llamada privada de la sesión en mobile: usePrivateCall (core) con la misma sala que los canales, más lo
 * que es de la app: si la pantalla de la llamada está abierta, la confirmación al llamar desde un canal de
 * voz, la vibración mientras suena y los avisos. Se monta una sola vez (en MobileShell); `enabled` sigue a la
 * app en primer plano: al volver, core reconcilia con el backend.
 */
export function usePrivateCallSession({ voice, enabled }: { voice: VoiceRoom; enabled: boolean }) {
  const { showToast } = useUI()
  const call = usePrivateCall({ room: voice, enabled })
  const { state, dismiss } = call
  // Pantalla de la llamada a la vista (si no, la llamada sigue en la barra de abajo)
  const [viewOpen, setViewOpen] = useState(false)
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null)
  // Nombre de a quién se llamó desde el chat, por si la conversación todavía no está en la lista
  const [requested, setRequested] = useState<PendingCall | null>(null)

  const { data: conversations } = useConversationsQuery()
  const conversationId = state.status === 'idle' ? null : state.conversationId
  const peerId = conversations?.find(c => c.id === conversationId)?.otherUserId ?? null
  const describeUser = useUserDisplay(peerId ? [peerId] : [])
  const requestedName = requested?.conversationId === conversationId ? requested?.name : undefined
  const peer: CallPeer = peerId
    ? { id: peerId, ...describeUser(peerId) }
    : { id: null, name: requestedName ?? 'Usuario', avatar: null }

  const begin = useCallback(
    async (target: PendingCall) => {
      setRequested(target)
      setViewOpen(true)
      try {
        const { microphoneAvailable } = await call.start(target.conversationId)
        if (!microphoneAvailable) showToast('Llamada sin micrófono: revisá los permisos de la app', 'info')
      } catch (err) {
        if (!(err instanceof ApiError)) console.error('[Call] No se pudo iniciar la llamada:', err)
        setViewOpen(false)
        showToast(callSentence(callErrorMessage(err), target.name), 'error')
      }
    },
    [call, showToast],
  )

  /** El botón de llamar del chat. En un canal de voz de servidor, primero pide confirmación. */
  const requestCall = useCallback(
    (conversationId: string, name: string) => {
      if (!callsSupported()) {
        showToast(unsupportedMessage(), 'info')
        return
      }
      if (isCallOpen(state)) {
        if (state.conversationId === conversationId) setViewOpen(true)
        else showToast('Ya estás en una llamada', 'info')
        return
      }
      const target = { conversationId, name }
      if (voice.channelId) setPendingCall(target)
      else begin(target)
    },
    [begin, showToast, state, voice.channelId],
  )

  const confirmPendingCall = useCallback(() => {
    const target = pendingCall
    setPendingCall(null)
    if (target) begin(target)
  }, [begin, pendingCall])

  const cancelPendingCall = useCallback(() => setPendingCall(null), [])

  /** Atiende (saca del canal de voz si estaba en uno). */
  const accept = useCallback(async () => {
    setViewOpen(true)
    try {
      const { microphoneAvailable } = await call.accept()
      if (!microphoneAvailable) showToast('Llamada sin micrófono: revisá los permisos de la app', 'info')
    } catch (err) {
      if (!(err instanceof ApiError)) console.error('[Call] No se pudo atender la llamada:', err)
      setViewOpen(false)
      showToast(callSentence(callErrorMessage(err), peer.name), 'error')
    }
  }, [call, peer.name, showToast])

  // Suena: vibra hasta atender, rechazar o que deje de sonar (con la app en primer plano: no hay push todavía)
  const ringing = state.status === 'incoming' && !state.accepting
  useEffect(() => {
    if (!ringing || !enabled) return
    Vibration.vibrate(RINGING_VIBRATION, true)
    return () => Vibration.cancel()
  }, [ringing, enabled])

  // Terminó: con la pantalla abierta, el motivo queda a la vista un momento; si no, un aviso
  const endedText = state.status === 'ended' ? callEndText(state.reason, state.role, peer.name) : null
  const endedCallId = state.status === 'ended' ? state.call.id : null
  useEffect(() => {
    if (!endedCallId || !endedText) return
    if (!viewOpen) {
      showToast(endedText, 'info')
      dismiss()
      return
    }
    const timer = setTimeout(() => {
      setViewOpen(false)
      dismiss()
    }, CALL_ENDED_NOTICE_MS)
    return () => clearTimeout(timer)
    // El aviso es uno por llamada: no se repite si cambia el nombre o se cierra la pantalla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endedCallId])

  // Sin llamada no hay pantalla (rechazó, la atendió otro dispositivo, cerró sesión). Se ajusta al dibujar,
  // no en un efecto: así la próxima llamada no arranca con la pantalla de la anterior
  const [lastStatus, setLastStatus] = useState(state.status)
  if (lastStatus !== state.status) {
    setLastStatus(state.status)
    if (state.status === 'idle') setViewOpen(false)
  }

  /** Cierra el aviso de fin antes de tiempo. */
  const closeEnded = useCallback(() => {
    setViewOpen(false)
    dismiss()
  }, [dismiss])

  return {
    state,
    /** Conversación de la llamada sonando o activa (null sin llamada): el chat no ofrece llamar de nuevo. */
    callConversationId: isCallOpen(state) ? state.conversationId : null,
    peer,
    endedText,
    supported: callsSupported(),
    unsupportedMessage: unsupportedMessage(),
    viewOpen,
    openView: useCallback(() => setViewOpen(true), []),
    minimize: useCallback(() => setViewOpen(false), []),
    requestCall,
    pendingCall,
    confirmPendingCall,
    cancelPendingCall,
    accept,
    decline: call.decline,
    hangUp: call.hangUp,
    closeEnded,
  }
}

export type PrivateCallSession = ReturnType<typeof usePrivateCallSession>

/**
 * La línea de estado de la llamada (llamando…, conectando, la duración), al día cada segundo mientras está
 * activa. Va en un hook aparte para que el reloj vuelva a dibujar solo la barra o la pantalla de la llamada.
 */
export function useCallStatusLine(state: PrivateCallState, connection: VoiceConnectionState): string | null {
  const [now, setNow] = useState(() => Date.now())
  const ticking = state.status === 'active'
  useEffect(() => {
    if (!ticking) return
    const timer = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [ticking])
  return callStatusLine(state, connection, now)
}
