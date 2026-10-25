import React from 'react'
import { View } from 'react-native'
import { makeStyles } from '../../theme'
import { ActionLink, Modal, ModalForm, SquareAvatar, Text } from '../../ui'

export interface VoiceParticipantTarget {
  id: string
  name: string
}

interface VoiceParticipantActionsProps {
  /** Participante sobre el que se mantuvo presionado; null cierra el menú. */
  participant: VoiceParticipantTarget | null
  isLocallyMuted: boolean
  onToggleLocalMute: (userId: string) => void
  onClose: () => void
}

/** Silenciar a alguien de la llamada solo para vos (mantener presionado sobre su ficha o su nombre). */
export default function VoiceParticipantActions({ participant, isLocallyMuted, onToggleLocalMute, onClose }: VoiceParticipantActionsProps) {
  const styles = useStyles()
  return (
    <Modal visible={!!participant} title={participant?.name ?? ''} onClose={onClose}>
      {participant && (
        <ModalForm>
          <View style={styles.row}>
            <SquareAvatar user={{ username: participant.name }} size="md" />
            <Text variant="bodySmall" tone="muted" style={styles.hint}>
              / Solo afecta lo que escuchás vos.
            </Text>
          </View>
          <ActionLink
            size="bodySmall"
            onPress={() => {
              onToggleLocalMute(participant.id)
              onClose()
            }}
          >
            {isLocallyMuted ? 'dejar de silenciar para mí' : 'silenciar para mí'}
          </ActionLink>
        </ModalForm>
      )}
    </Modal>
  )
}

const useStyles = makeStyles(t => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  hint: { flex: 1 },
}))
