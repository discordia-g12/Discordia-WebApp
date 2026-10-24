import React, { useEffect, useRef, useState } from 'react'
import { Animated, Image, LayoutAnimation, Pressable, ScrollView, View } from 'react-native'
import { MicOff, VolumeX } from 'lucide-react-native'
import type { VoiceConnectionState } from '@discordia/core'
import { makeStyles, useTheme } from '../../theme'
import { Text, initials, useNativeDriver, useReducedMotion } from '../../ui'
import { CallState } from '../shell/CallBar'

export interface VoiceScreenParticipant {
  id: string
  name: string
  color: string
  avatar?: string | null
  isLocal: boolean
  isSpeaking: boolean
  isMuted: boolean
  /** Silenciado solo para este dispositivo. */
  isLocallyMuted?: boolean
}

interface VoiceScreenProps {
  channelName: string
  serverName?: string
  connectionState: VoiceConnectionState
  participants: VoiceScreenParticipant[]
  /** Abre la invitación al servidor (la última ficha). */
  onInvite?: () => void
  /** Mantener presionado sobre otro participante (silenciarlo para vos). */
  onLongPressParticipant?: (participant: VoiceScreenParticipant) => void
}

/**
 * Llamada (PDF, pág. 10), como la web: mosaico a sangre de fichas separadas por líneas finas, con la foto
 * (o las iniciales en grande) y el nombre en la etiqueta negra al pie. Las fichas se reacomodan animadas
 * al entrar o salir alguien; quien habla tiene un borde grueso que late. Los controles (micrófono, audio,
 * colgar) están en la barra de la llamada, que se ve en toda la app.
 */
export default function VoiceScreen({ channelName, serverName, connectionState, participants, onInvite, onLongPressParticipant }: VoiceScreenProps) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const [width, setWidth] = useState(0)

  // Al entrar o salir alguien, las fichas se reacomodan animadas
  const ids = participants.map(p => p.id).join(',')
  const previous = useRef(ids)
  if (previous.current !== ids) {
    previous.current = ids
    if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
  }

  // Una columna con una sola persona; dos con más (en un teléfono, tres quedan muy chicas)
  const tiles = participants.length + (onInvite ? 1 : 0)
  const columns = tiles <= 1 ? 1 : 2
  const side = width > 0 ? Math.floor(width / columns) : 0
  const tileStyle = { width: side, height: columns === 1 ? Math.round(side * 1.1) : side }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="bodySmall" bold numberOfLines={1} style={styles.title}>
          •{channelName}
          {serverName ? <Text variant="bodySmall" tone="muted"> / {serverName}</Text> : null}
        </Text>
        <CallState state={connectionState} />
      </View>

      <ScrollView onLayout={e => setWidth(e.nativeEvent.layout.width)} contentContainerStyle={styles.grid}>
        {side > 0 &&
          participants.map(p => (
            <Tile key={p.id} participant={p} style={tileStyle} onLongPress={p.isLocal ? undefined : onLongPressParticipant} />
          ))}
        {side > 0 && onInvite && (
          <View style={[styles.tile, styles.inviteTile, tileStyle]}>
            <Pressable onPress={onInvite} accessibilityRole="button" accessibilityLabel="Invitar a la llamada" hitSlop={8}>
              <Text bold>Invitar a la llamada +</Text>
            </Pressable>
            <Text variant="meta" tone="muted">
              Elegir actividad / próximamente
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function Tile({
  participant: p,
  style,
  onLongPress,
}: {
  participant: VoiceScreenParticipant
  style: { width: number; height: number }
  onLongPress?: (participant: VoiceScreenParticipant) => void
}) {
  const styles = useStyles()
  const { colors } = useTheme()
  const [broken, setBroken] = useState(false)
  return (
    <Pressable
      style={[styles.tile, style]}
      onLongPress={onLongPress ? () => onLongPress(p) : undefined}
      delayLongPress={350}
      accessibilityLabel={`${p.name}${p.isLocal ? ' (vos)' : ''}${p.isSpeaking ? ', hablando' : ''}${p.isMuted ? ', micrófono silenciado' : ''}${p.isLocallyMuted ? ', silenciado para vos' : ''}`}
      accessibilityHint={onLongPress ? 'Mantené presionado para silenciarlo solo para vos' : undefined}
    >
      {p.avatar && !broken ? (
        <Image source={{ uri: p.avatar }} style={styles.photo} onError={() => setBroken(true)} />
      ) : (
        <View style={styles.initials}>
          <Text tone="inverse" style={[styles.initialsText, { fontSize: style.width * 0.28, lineHeight: style.width * 0.32 }]}>
            {initials(p.name)}
          </Text>
        </View>
      )}
      <View style={styles.label}>
        {p.isMuted && <MicOff color={colors.inverseText} size={12} strokeWidth={1.5} />}
        <Text variant="meta" tone="inverse" bold numberOfLines={1} style={styles.labelName}>
          {p.name}
          {p.isLocal ? ' (vos)' : ''}
        </Text>
        {p.isLocallyMuted && (
          <>
            <VolumeX color={colors.inverseText} size={12} strokeWidth={1.5} />
            <Text variant="meta" tone="inverse">
              silenciado para vos
            </Text>
          </>
        )}
      </View>
      {p.isSpeaking && <SpeakingBorder />}
    </Pressable>
  )
}

/** Borde grueso que late mientras la persona habla (quieto con movimiento reducido). */
function SpeakingBorder() {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const [opacity] = useState(() => new Animated.Value(1))
  useEffect(() => {
    if (reduce) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [reduce, opacity])
  return <Animated.View pointerEvents="none" style={[styles.speaking, { opacity }]} />
}

const useStyles = makeStyles(t => ({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: t.space[2],
    height: t.space[7],
    paddingTop: t.space[4],
    paddingHorizontal: t.space[4],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
  title: { flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // Fichas separadas por líneas finas (borde derecho e inferior de cada una)
  tile: {
    overflow: 'hidden',
    borderRightWidth: t.lines.hairline,
    borderBottomWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
    backgroundColor: t.colors.line,
  },
  photo: { width: '100%', height: '100%' },
  initials: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.inverseBackground },
  initialsText: { fontFamily: t.fonts[900], letterSpacing: -1 },
  label: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    paddingVertical: 2,
    paddingHorizontal: t.space[2],
    backgroundColor: t.colors.inverseBackground,
  },
  labelName: { flexShrink: 1 },
  // Del color del texto invertido: se ve sobre el bloque de las iniciales y sobre una foto, en los dos temas
  speaking: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 4, borderColor: t.colors.inverseText },
  inviteTile: { justifyContent: 'flex-end', gap: t.space[1], padding: t.space[4], backgroundColor: 'transparent' },
}))
