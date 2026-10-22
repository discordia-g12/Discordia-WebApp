import { useCallback, useEffect, useRef, useState } from 'react'
import { getWsBaseUrl } from '../utils/config'
import type { MessageBackendPayload } from '../types'

export interface UseChannelSocketOptions {
  channelId: string | null
  token: string | null
  currentUserId: string
  lastMessageIdSeen?: string
  onMessageReceived: (message: MessageBackendPayload) => void
  onErrorReceived: (errorMessage: string) => void
}

export interface UseChannelSocketReturn {
  isConnected: boolean
  isConnecting: boolean
  sendMessage: (content: string) => boolean
  reconnect: () => void
}

const INITIAL_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000
const BACKOFF_MULTIPLIER = 1.5

export function useChannelSocket({
  channelId,
  token,
  currentUserId,
  lastMessageIdSeen,
  onMessageReceived,
  onErrorReceived,
}: UseChannelSocketOptions): UseChannelSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  // Guardar callbacks en refs para evitar reconexiones innecesarias ante cambios de función
  const onMessageRef = useRef(onMessageReceived)
  const onErrorRef = useRef(onErrorReceived)
  const lastMessageIdRef = useRef(lastMessageIdSeen)

  useEffect(() => {
    onMessageRef.current = onMessageReceived
  }, [onMessageReceived])

  useEffect(() => {
    onErrorRef.current = onErrorReceived
  }, [onErrorReceived])

  useEffect(() => {
    lastMessageIdRef.current = lastMessageIdSeen
  }, [lastMessageIdSeen])

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }

  const closeWebSocket = () => {
    clearReconnectTimer()
    if (wsRef.current) {
      // Eliminar handlers para que no disparen reconexión al cerrar intencionalmente
      wsRef.current.onopen = null
      wsRef.current.onmessage = null
      wsRef.current.onerror = null
      wsRef.current.onclose = null
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close()
      }
      wsRef.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
  }

  const connect = useCallback(() => {
    // Si no hay canal válido o token, o es un canal de DM mock, no conectar
    if (!channelId || !token || channelId.startsWith('dm-')) {
      closeWebSocket()
      return
    }

    closeWebSocket()
    setIsConnecting(true)

    const wsBase = getWsBaseUrl().replace(/\/$/, '')
    const params = new URLSearchParams({ token })
    if (lastMessageIdRef.current) {
      params.append('last_message_id_seen', lastMessageIdRef.current)
    }

    const wsUrl = `${wsBase}/api/v1/chat/channels/${channelId}/ws?${params.toString()}`

    try {
      const socket = new WebSocket(wsUrl)
      wsRef.current = socket

      socket.onopen = () => {
        if (!isMountedRef.current) return
        setIsConnected(true)
        setIsConnecting(false)
        reconnectAttemptsRef.current = 0
        clearReconnectTimer()
      }

      socket.onmessage = event => {
        if (!isMountedRef.current) return
        try {
          const data = JSON.parse(event.data)
          if (data.error) {
            onErrorRef.current(String(data.error))
          } else if (data.id && data.content !== undefined) {
            onMessageRef.current(data as MessageBackendPayload)
          }
        } catch {
          // Si el mensaje no es JSON válido, ignorar
        }
      }

      socket.onerror = () => {
        if (!isMountedRef.current) return
        setIsConnected(false)
        setIsConnecting(false)
      }

      socket.onclose = () => {
        if (!isMountedRef.current) return
        setIsConnected(false)
        setIsConnecting(false)

        // Programar reconexión automática con exponential backoff
        clearReconnectTimer()
        const delay = Math.min(
          INITIAL_RECONNECT_DELAY_MS *
            Math.pow(BACKOFF_MULTIPLIER, reconnectAttemptsRef.current),
          MAX_RECONNECT_DELAY_MS,
        )
        reconnectAttemptsRef.current += 1

        reconnectTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connect()
          }
        }, delay)
      }
    } catch {
      setIsConnected(false)
      setIsConnecting(false)
    }
  }, [channelId, token])

  useEffect(() => {
    isMountedRef.current = true
    reconnectAttemptsRef.current = 0
    connect()

    return () => {
      isMountedRef.current = false
      closeWebSocket()
    }
  }, [connect])

  const sendMessage = useCallback(
    (content: string): boolean => {
      if (
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN ||
        !content.trim()
      ) {
        return false
      }

      const payload = {
        authorId: currentUserId,
        content: content.trim(),
      }

      try {
        wsRef.current.send(JSON.stringify(payload))
        return true
      } catch {
        return false
      }
    },
    [currentUserId],
  )

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  return {
    isConnected,
    isConnecting,
    sendMessage,
    reconnect,
  }
}
