import React, { useEffect, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { Headphones, HeadphoneOff, Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react-native'
import type { VoiceConnectionState } from '@discordia/core'
import { makeStyles, useTheme } from '../../theme'
import { Text, useNativeDriver, useReducedMotion } from '../../ui'

interface CallBarProps {
  channelName: string
  serverName?: string
  connectionState: VoiceConnectionState
  isMuted: boolean
  isDeafened: boolean
  onOpen: () => void
  onToggleMute: () => void
  onToggleDeafen: () => void
  onDisconnect: () => void
  /** Cámara propia prendida. */
  isCameraOn?: boolean
  /** Prende o apaga la cámara; sin esta función no se muestra el botón (p. ej. en Expo Go). */
  onToggleCamera?: () => void
  /** Sus roles no le dejan hablar / usar la cámara en este canal: el botón se ve atenuado. */
  cannotSpeak?: boolean
  cannotUseCamera?: boolean
  /** Tocar un botón bloqueado: la app explica por qué (en el teléfono no hay tooltip). */
  onBlocked?: (message: string) => void
}

const CANNOT_SPEAK = 'No tenés permiso para hablar en este canal'
const CANNOT_USE_CAMERA = 'No tenés permiso para usar la cámara en este canal'

const STATE_LABEL: Record<VoiceConnectionState, string> = {
  connecting: 'conectando',
  connected: 'conectado',
  reconnecting: 'reconectando',
  disconnected: 'desconectado',
}

/**
 * Llamada en curso, sobre la barra inferior en toda la app: en qué canal estás (lleva de vuelta a la
 * llamada), su estado y micrófono, audio y colgar, separados por líneas. En gris, como la marca de agua
 * del escritorio durante una llamada.
 */
export function CallBar({
  channelName,
  serverName,
  connectionState,
  isMuted,
  isDeafened,
  onOpen,
  onToggleMute,
  onToggleDeafen,
  onDisconnect,
  isCameraOn = false,
  onToggleCamera,
  cannotSpeak = false,
  cannotUseCamera = false,
  onBlocked,
}: CallBarProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const MicIcon = isMuted ? MicOff : Mic
  const AudioIcon = isDeafened ? HeadphoneOff : Headphones
  const CameraIcon = isCameraOn ? Video : VideoOff
  // La cámara se publica en la sala: solo con la conexión establecida
  const cameraUsable = connectionState === 'connected'

  return (
    <View style={styles.bar}>
      <Pressable style={styles.info} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Volver a la llamada en ${channelName}`}>
        <Text variant="bodySmall" bold numberOfLines={1}>
          •{channelName}
          {serverName ? <Text variant="bodySmall" tone="muted"> / {serverName}</Text> : null}
        </Text>
        <CallState state={connectionState} />
      </Pressable>
      <Pressable
        style={[styles.control, cannotSpeak && styles.disabled]}
        onPress={cannotSpeak ? () => onBlocked?.(CANNOT_SPEAK) : onToggleMute}
        accessibilityRole="button"
        accessibilityLabel={cannotSpeak ? CANNOT_SPEAK : isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
        accessibilityState={{ selected: isMuted, disabled: cannotSpeak }}
      >
        <MicIcon color={colors.text} size={18} strokeWidth={1.5} />
      </Pressable>
      <Pressable style={styles.control} onPress={onToggleDeafen} accessibilityRole="button" accessibilityLabel={isDeafened ? 'Activar audio' : 'Desactivar audio'} accessibilityState={{ selected: isDeafened }}>
        <AudioIcon color={colors.text} size={18} strokeWidth={1.5} />
      </Pressable>
      {onToggleCamera && (
        <Pressable
          style={[styles.control, isCameraOn && styles.active, (!cameraUsable || cannotUseCamera) && styles.disabled]}
          onPress={cannotUseCamera ? () => onBlocked?.(CANNOT_USE_CAMERA) : onToggleCamera}
          disabled={!cameraUsable}
          accessibilityRole="button"
          accessibilityLabel={cannotUseCamera ? CANNOT_USE_CAMERA : isCameraOn ? 'Apagar cámara' : 'Prender cámara'}
          accessibilityState={{ selected: isCameraOn, disabled: !cameraUsable || cannotUseCamera }}
        >
          <CameraIcon color={isCameraOn ? colors.inverseText : colors.text} size={18} strokeWidth={1.5} />
        </Pressable>
      )}
      <Pressable style={[styles.control, styles.hangUp]} onPress={onDisconnect} accessibilityRole="button" accessibilityLabel="Colgar">
        <PhoneOff color={colors.onDanger} size={18} strokeWidth={1.5} />
      </Pressable>
    </View>
  )
}

/** "conectado/"; mientras conecta o reconecta, late. */
export function CallState({ state }: { state: VoiceConnectionState }) {
  const reduce = useReducedMotion()
  const [opacity] = useState(() => new Animated.Value(1))
  const pending = state === 'connecting' || state === 'reconnecting'
  useEffect(() => {
    if (!pending || reduce) {
      opacity.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [pending, reduce, opacity])
  return (
    <Animated.View style={{ opacity }} accessibilityLiveRegion="polite">
      <Text variant="meta" tone="muted">
        {STATE_LABEL[state]}/
      </Text>
    </Animated.View>
  )
}

const useStyles = makeStyles(t => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: t.layout.userBarHeight,
    borderTopWidth: t.lines.hairline,
    borderTopColor: t.colors.lineStrong,
    backgroundColor: t.colors.line,
  },
  info: { flex: 1, justifyContent: 'center', paddingHorizontal: t.space[4] },
  control: {
    width: t.layout.userBarHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: t.lines.hairline,
    borderLeftColor: t.colors.lineStrong,
  },
  // Cámara prendida: el bloque invertido, como un interruptor encendido
  active: { backgroundColor: t.colors.inverseBackground },
  disabled: { opacity: 0.4 },
  // Colgar: el único bloque rojo (acción destructiva)
  hangUp: { backgroundColor: t.colors.danger },
}))
