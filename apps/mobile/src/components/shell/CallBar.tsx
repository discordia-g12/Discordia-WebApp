import React, { useEffect, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { Headphones, HeadphoneOff, Mic, MicOff, PhoneOff } from 'lucide-react-native'
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
}

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
export function CallBar({ channelName, serverName, connectionState, isMuted, isDeafened, onOpen, onToggleMute, onToggleDeafen, onDisconnect }: CallBarProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const MicIcon = isMuted ? MicOff : Mic
  const AudioIcon = isDeafened ? HeadphoneOff : Headphones

  return (
    <View style={styles.bar}>
      <Pressable style={styles.info} onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Volver a la llamada en ${channelName}`}>
        <Text variant="bodySmall" bold numberOfLines={1}>
          •{channelName}
          {serverName ? <Text variant="bodySmall" tone="muted"> / {serverName}</Text> : null}
        </Text>
        <CallState state={connectionState} />
      </Pressable>
      <Pressable style={styles.control} onPress={onToggleMute} accessibilityRole="button" accessibilityLabel={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'} accessibilityState={{ selected: isMuted }}>
        <MicIcon color={colors.text} size={18} strokeWidth={1.5} />
      </Pressable>
      <Pressable style={styles.control} onPress={onToggleDeafen} accessibilityRole="button" accessibilityLabel={isDeafened ? 'Activar audio' : 'Desactivar audio'} accessibilityState={{ selected: isDeafened }}>
        <AudioIcon color={colors.text} size={18} strokeWidth={1.5} />
      </Pressable>
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
  // Colgar: el único bloque rojo (acción destructiva)
  hangUp: { backgroundColor: t.colors.danger },
}))
