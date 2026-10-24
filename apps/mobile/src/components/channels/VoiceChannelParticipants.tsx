import React, { useEffect, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'
import { HeadphoneOff, MicOff, VolumeX } from 'lucide-react-native'
import { makeStyles, useTheme } from '../../theme'
import { SquareAvatar, Text, useNativeDriver, useReducedMotion } from '../../ui'

export interface VoiceChannelParticipant {
  id: string
  name: string
  color: string
  avatar?: string | null
  /** Solo se conoce en el canal en el que está el propio usuario (datos de LiveKit). */
  isSpeaking?: boolean
  isMuted?: boolean
  isDeafened?: boolean
  /** Silenciado solo para este dispositivo. */
  isLocallyMuted?: boolean
}

interface VoiceChannelParticipantsProps {
  participants: VoiceChannelParticipant[]
  /** ID del usuario actual: sobre sí mismo no se abre el menú. */
  currentUserId?: string
  onLongPressParticipant?: (participant: VoiceChannelParticipant) => void
}

/** Quién está en un canal de voz, bajo el canal: avatar cuadrado (quien habla, con un contorno que late) y nombre. */
export default function VoiceChannelParticipants({ participants, currentUserId, onLongPressParticipant }: VoiceChannelParticipantsProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  if (participants.length === 0) return null

  return (
    <View style={styles.list}>
      {participants.map(p => (
        <Pressable
          key={p.id}
          style={styles.row}
          onLongPress={p.id === currentUserId || !onLongPressParticipant ? undefined : () => onLongPressParticipant(p)}
          delayLongPress={350}
          accessibilityLabel={`${p.name} en el canal de voz${p.isSpeaking ? ', hablando' : ''}${p.isLocallyMuted ? ', silenciado para vos' : ''}`}
        >
          <SpeakingOutline speaking={!!p.isSpeaking}>
            <SquareAvatar user={{ username: p.name, avatar: p.avatar }} size={20} />
          </SpeakingOutline>
          <Text variant="meta" numberOfLines={1} style={styles.name}>
            {p.name}
          </Text>
          <View style={styles.flags}>
            {p.isMuted && <MicOff color={colors.textMuted} size={12} strokeWidth={1.5} />}
            {p.isDeafened && <HeadphoneOff color={colors.textMuted} size={12} strokeWidth={1.5} />}
            {p.isLocallyMuted && <VolumeX color={colors.textMuted} size={12} strokeWidth={1.5} />}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

/** Contorno de 2 px que late mientras la persona habla (quieto con movimiento reducido). */
export function SpeakingOutline({ speaking, children, width = 2 }: { speaking: boolean; children: React.ReactNode; width?: number }) {
  const { colors } = useTheme()
  const reduce = useReducedMotion()
  const [pulse] = useState(() => new Animated.Value(1))
  useEffect(() => {
    if (!speaking || reduce) {
      pulse.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.15, duration: 600, useNativeDriver }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [speaking, reduce, pulse])

  return (
    <View style={{ padding: width + 1 }}>
      {speaking && (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: width, borderColor: colors.lineStrong, opacity: pulse }}
        />
      )}
      {children}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  list: { paddingLeft: t.space[5] + t.space[2], paddingRight: t.space[5], paddingBottom: t.space[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], minHeight: 28 },
  name: { flex: 1 },
  flags: { flexDirection: 'row', gap: t.space[1] },
}))
