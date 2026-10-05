import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Volume2, VolumeX } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../../theme'
import Avatar from '../shared/Avatar'

export interface VoiceParticipantTarget {
  id: string
  name: string
  color: string
}

interface VoiceParticipantActionsProps {
  /** Participante sobre el que se mantuvo presionado; null cierra el menú. */
  participant: VoiceParticipantTarget | null
  isLocallyMuted: boolean
  onToggleLocalMute: (userId: string) => void
  onClose: () => void
}

// Menú de un participante de voz (al mantener presionado): silenciarlo solo para vos
export default function VoiceParticipantActions({
  participant,
  isLocallyMuted,
  onToggleLocalMute,
  onClose,
}: VoiceParticipantActionsProps) {
  return (
    <Modal visible={!!participant} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {participant && (
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.header}>
              <Avatar label={participant.name} color={participant.color} size={36} />
              <Text style={styles.name} numberOfLines={1}>
                {participant.name}
              </Text>
            </View>

            <Pressable
              style={styles.option}
              onPress={() => {
                onToggleLocalMute(participant.id)
                onClose()
              }}
              accessibilityRole="button"
            >
              {isLocallyMuted ? (
                <Volume2 color={colors.text} size={20} />
              ) : (
                <VolumeX color={colors.danger} size={20} />
              )}
              <View style={styles.optionTexts}>
                <Text style={[styles.optionLabel, !isLocallyMuted && styles.optionLabelDanger]}>
                  {isLocallyMuted ? 'Dejar de silenciar para mí' : 'Silenciar para mí'}
                </Text>
                <Text style={styles.optionHint}>Solo afecta lo que escuchás vos</Text>
              </View>
            </Pressable>

            <Pressable style={styles.cancel} onPress={onClose} accessibilityRole="button">
              <Text style={styles.cancelLabel}>Cancelar</Text>
            </Pressable>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { ...typography.username, color: colors.text, flex: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  optionTexts: { flex: 1 },
  optionLabel: { ...typography.button, color: colors.text },
  optionLabelDanger: { color: colors.danger },
  optionHint: { ...typography.metadata, color: colors.textMuted },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.elevated,
  },
  cancelLabel: { ...typography.button, color: colors.text },
})
