import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MicOff, VolumeX } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../../theme'
import Avatar from '../shared/Avatar'

export interface VoiceChannelParticipant {
  id: string
  name: string
  color: string
  /** Solo se conoce en el canal en el que está el propio usuario (datos de LiveKit). */
  isSpeaking?: boolean
  isMuted?: boolean
  /** Silenciado solo para este dispositivo. */
  isLocallyMuted?: boolean
}

interface VoiceChannelParticipantsProps {
  participants: VoiceChannelParticipant[]
  /** ID del usuario actual: sobre sí mismo no se abre el menú. */
  currentUserId?: string
  onLongPressParticipant?: (participant: VoiceChannelParticipant) => void
}

// Quién está conectado a un canal de voz, debajo del canal en la lista
export default function VoiceChannelParticipants({
  participants,
  currentUserId,
  onLongPressParticipant,
}: VoiceChannelParticipantsProps) {
  if (participants.length === 0) return null

  return (
    <View style={styles.list}>
      {participants.map(p => (
        <Pressable
          key={p.id}
          style={styles.row}
          onLongPress={
            p.id === currentUserId || !onLongPressParticipant ? undefined : () => onLongPressParticipant(p)
          }
          delayLongPress={350}
          accessibilityLabel={`${p.name} en el canal de voz${p.isLocallyMuted ? ', silenciado para vos' : ''}`}
        >
          <View style={[styles.avatarRing, p.isSpeaking && styles.avatarRingSpeaking]}>
            <Avatar label={p.name} color={p.color} size={22} fontSize={11} />
          </View>
          <Text style={[styles.name, p.isSpeaking && styles.nameSpeaking]} numberOfLines={1}>
            {p.name}
          </Text>
          {p.isMuted && <MicOff color={colors.danger} size={13} />}
          {p.isLocallyMuted && <VolumeX color={colors.danger} size={13} />}
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { paddingLeft: spacing.xl + spacing.sm, paddingRight: spacing.md, paddingBottom: spacing.xs, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  avatarRing: { padding: 1, borderRadius: radii.full, borderWidth: 2, borderColor: 'transparent' },
  avatarRingSpeaking: { borderColor: colors.online },
  name: { ...typography.metadata, fontSize: 13, color: colors.textMuted, flex: 1 },
  nameSpeaking: { color: colors.online },
})
