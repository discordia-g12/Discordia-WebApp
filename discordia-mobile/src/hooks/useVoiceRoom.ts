import { useCallback, useEffect, useRef, useState } from 'react'
import { PermissionsAndroid, Platform } from 'react-native'
import type { ConnectionState, Participant, RemoteParticipant, Room } from 'livekit-client'
import { joinVoiceChannel, leaveVoiceChannel } from '@shared/api/voice'
import { isVoiceSupported } from '../utils/voice'

/*
 * Versión mobile de src/api/hooks/useVoiceRoom.ts (web). La lógica es la misma; cambia:
 *  - El audio de los demás lo reproduce LiveKit solo (en la web hay que crear elementos <audio>).
 *  - Hay que abrir la sesión de audio del teléfono (modo llamada) antes de conectar.
 *  - En Android el permiso de micrófono se pide en tiempo de ejecución.
 *  - LiveKit se carga con require solo si existe el módulo nativo: en Expo Go no se toca.
 */

type LiveKitClient = typeof import('livekit-client')
type LiveKitReactNative = typeof import('@livekit/react-native')

const loadLiveKit = (): LiveKitClient => require('livekit-client')
const loadLiveKitNative = (): LiveKitReactNative => require('@livekit/react-native')

export type VoiceConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

export interface VoiceRoomParticipant {
  /** Identidad en LiveKit: el user ID (sub de Auth0). */
  id: string
  isLocal: boolean
  isSpeaking: boolean
  isMuted: boolean
}

export interface VoiceJoinResult {
  /** false si no se dio permiso de micrófono: queda conectado pero silenciado. */
  microphoneAvailable: boolean
}

export interface UseVoiceRoomOptions {
  /** Se llama cuando la sala se cierra sin que el usuario lo pida (red, servidor LiveKit). */
  onUnexpectedDisconnect?: () => void
}

function toParticipant(participant: Participant, isLocal: boolean): VoiceRoomParticipant {
  return {
    id: participant.identity,
    isLocal,
    isSpeaking: participant.isSpeaking,
    isMuted: !participant.isMicrophoneEnabled,
  }
}

function toConnectionState(state: ConnectionState): VoiceConnectionState {
  switch (state) {
    case 'connected':
      return 'connected'
    case 'connecting':
      return 'connecting'
    case 'disconnected':
      return 'disconnected'
    default:
      return 'reconnecting'
  }
}

async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true // en iOS lo pide el sistema al abrir el micrófono
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Micrófono',
    message: 'Discordia necesita el micrófono para que puedas hablar en los canales de voz.',
    buttonPositive: 'Permitir',
    buttonNegative: 'Ahora no',
  })
  return result === PermissionsAndroid.RESULTS.GRANTED
}

/**
 * Conexión a un canal de voz vía LiveKit (solo audio). Una sola sala activa a la vez: unirse a
 * otro canal cierra la anterior. Mute y deafen se pueden cambiar sin estar conectado.
 */
export function useVoiceRoom(options: UseVoiceRoomOptions = {}) {
  const onUnexpectedDisconnectRef = useRef(options.onUnexpectedDisconnect)
  onUnexpectedDisconnectRef.current = options.onUnexpectedDisconnect

  const roomRef = useRef<Room | null>(null)
  // Canal pedido más recientemente; permite descartar joins que quedaron viejos
  const channelIdRef = useRef<string | null>(null)
  const mutedRef = useRef(false)
  const deafenedRef = useRef(false)
  const mutedBeforeDeafenRef = useRef(false)

  const [channelId, setChannelId] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>('disconnected')
  const [participants, setParticipants] = useState<VoiceRoomParticipant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)

  const syncParticipants = useCallback(() => {
    const room = roomRef.current
    if (!room) {
      setParticipants([])
      return
    }
    setParticipants([
      toParticipant(room.localParticipant, true),
      ...Array.from(room.remoteParticipants.values()).map(p => {
        const participant = toParticipant(p, false)
        // Ensordecido no escuchás a nadie: no se marca a nadie como hablando
        if (deafenedRef.current) participant.isSpeaking = false
        return participant
      }),
    ])
  }, [])

  const applyVolume = useCallback((participant: RemoteParticipant) => {
    participant.setVolume(deafenedRef.current ? 0 : 1)
  }, [])

  const disconnectRoom = useCallback(async (room: Room) => {
    room.removeAllListeners()
    await room.disconnect()
    await loadLiveKitNative().AudioSession.stopAudioSession().catch(() => undefined)
  }, [])

  const resetState = useCallback(() => {
    roomRef.current = null
    channelIdRef.current = null
    setChannelId(null)
    setConnectionState('disconnected')
    setParticipants([])
  }, [])

  const bindRoomEvents = useCallback(
    (room: Room) => {
      const { RoomEvent } = loadLiveKit()
      const syncIfCurrent = () => {
        if (roomRef.current === room) syncParticipants()
      }

      room
        .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          applyVolume(participant)
          syncIfCurrent()
        })
        .on(RoomEvent.TrackSubscribed, (_track, _pub, participant: RemoteParticipant) => {
          applyVolume(participant)
          syncIfCurrent()
        })
        .on(RoomEvent.ParticipantDisconnected, syncIfCurrent)
        .on(RoomEvent.ActiveSpeakersChanged, syncIfCurrent)
        .on(RoomEvent.TrackMuted, syncIfCurrent)
        .on(RoomEvent.TrackUnmuted, syncIfCurrent)
        .on(RoomEvent.TrackPublished, syncIfCurrent)
        .on(RoomEvent.TrackUnpublished, syncIfCurrent)
        .on(RoomEvent.LocalTrackPublished, syncIfCurrent)
        .on(RoomEvent.LocalTrackUnpublished, syncIfCurrent)
        .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          if (roomRef.current === room) setConnectionState(toConnectionState(state))
        })
        .on(RoomEvent.Disconnected, () => {
          // Desconexión no pedida por el usuario (red, servidor): limpiar y avisar al backend
          if (roomRef.current !== room) return
          disconnectRoom(room)
          resetState()
          leaveVoiceChannel().catch(err => console.error('[Voice] Error al salir del canal:', err))
          onUnexpectedDisconnectRef.current?.()
        })
    },
    [applyVolume, disconnectRoom, resetState, syncParticipants]
  )

  const join = useCallback(
    async (targetChannelId: string): Promise<VoiceJoinResult> => {
      if (!isVoiceSupported) {
        throw new Error('La voz no está disponible en esta build (Expo Go)')
      }
      if (channelIdRef.current === targetChannelId) {
        return { microphoneAvailable: true }
      }

      const previous = roomRef.current
      roomRef.current = null
      channelIdRef.current = targetChannelId
      setChannelId(targetChannelId)
      setConnectionState('connecting')
      setParticipants([])
      if (previous) await disconnectRoom(previous)

      const isSuperseded = () => channelIdRef.current !== targetChannelId
      let room: Room | null = null

      try {
        const { token, url } = await joinVoiceChannel(targetChannelId)
        if (isSuperseded()) return { microphoneAvailable: true }

        const { Room } = loadLiveKit()
        await loadLiveKitNative().AudioSession.startAudioSession()

        room = new Room()
        roomRef.current = room
        bindRoomEvents(room)
        await room.connect(url, token)
        if (isSuperseded()) return { microphoneAvailable: true }

        let microphoneAvailable = await requestMicrophonePermission()
        if (microphoneAvailable) {
          try {
            await room.localParticipant.setMicrophoneEnabled(!mutedRef.current)
          } catch (err) {
            console.error('[Voice] No se pudo acceder al micrófono:', err)
            microphoneAvailable = false
          }
        }
        if (!microphoneAvailable) {
          mutedRef.current = true
          setIsMuted(true)
        }

        setConnectionState('connected')
        syncParticipants()
        return { microphoneAvailable }
      } catch (err) {
        if (isSuperseded()) return { microphoneAvailable: true }
        if (room) await disconnectRoom(room)
        resetState()
        throw err
      }
    },
    [bindRoomEvents, disconnectRoom, resetState, syncParticipants]
  )

  const leave = useCallback(async () => {
    const room = roomRef.current
    const wasInChannel = channelIdRef.current !== null
    resetState()
    if (room) await disconnectRoom(room)
    if (wasInChannel) {
      await leaveVoiceChannel().catch(err => console.error('[Voice] Error al salir del canal:', err))
    }
  }, [disconnectRoom, resetState])

  const setMuted = useCallback(
    async (muted: boolean) => {
      mutedRef.current = muted
      setIsMuted(muted)
      const room = roomRef.current
      if (!room || room.state !== 'connected') return
      try {
        await room.localParticipant.setMicrophoneEnabled(!muted)
      } catch (err) {
        console.error('[Voice] No se pudo acceder al micrófono:', err)
        mutedRef.current = true
        setIsMuted(true)
      }
      syncParticipants()
    },
    [syncParticipants]
  )

  const setDeafened = useCallback(
    (deafened: boolean) => {
      deafenedRef.current = deafened
      setIsDeafened(deafened)
      roomRef.current?.remoteParticipants.forEach(applyVolume)
      syncParticipants()
    },
    [applyVolume, syncParticipants]
  )

  const toggleMute = useCallback(() => {
    // Como en Discord: activar el micrófono estando ensordecido también reactiva el audio
    if (deafenedRef.current) {
      setDeafened(false)
      setMuted(false)
    } else {
      setMuted(!mutedRef.current)
    }
  }, [setDeafened, setMuted])

  const toggleDeafen = useCallback(() => {
    if (deafenedRef.current) {
      setDeafened(false)
      setMuted(mutedBeforeDeafenRef.current)
    } else {
      mutedBeforeDeafenRef.current = mutedRef.current
      setDeafened(true)
      setMuted(true)
    }
  }, [setDeafened, setMuted])

  // Al desmontar (p. ej. logout) cerrar la sala y avisar al backend
  useEffect(() => {
    return () => {
      const room = roomRef.current
      const wasInChannel = channelIdRef.current !== null
      roomRef.current = null
      channelIdRef.current = null
      if (room) disconnectRoom(room)
      if (wasInChannel) leaveVoiceChannel().catch(() => undefined)
    }
  }, [disconnectRoom])

  return {
    channelId,
    connectionState,
    participants,
    isMuted,
    isDeafened,
    join,
    leave,
    toggleMute,
    toggleDeafen,
  }
}
