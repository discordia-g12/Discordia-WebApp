import React from 'react'
import { View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { makeStyles } from '../../theme'
import { ActionLink, Modal, ModalForm, Text } from '../../ui'
import type { Message } from '../../types'
import { useUI } from '../../providers/AppProviders'

interface MessageActionsModalProps {
  visible: boolean
  message: Message | null
  isAuthor: boolean
  canManageMessages?: boolean
  onEdit: () => void
  onReply?: () => void
  onDelete?: () => void
  onClose: () => void
}

/** Menú contextual de acciones sobre un mensaje (mantener presionado en mobile). */
export default function MessageActionsModal({
  visible,
  message,
  isAuthor,
  canManageMessages = false,
  onEdit,
  onReply,
  onDelete,
  onClose,
}: MessageActionsModalProps) {
  const styles = useStyles()
  const { showToast } = useUI()

  if (!message) return null

  const canDelete = Boolean(onDelete && (isAuthor || canManageMessages))

  const handleCopy = async () => {
    if (message.content) {
      await Clipboard.setStringAsync(message.content)
      showToast('Texto copiado al portapapeles', 'info')
    }
    onClose()
  }

  return (
    <Modal visible={visible} title="Mensaje" onClose={onClose}>
      <ModalForm>
        <View style={styles.preview}>
          <Text variant="bodySmall" tone="muted" numberOfLines={3} style={styles.content}>
            “{message.content}”
          </Text>
        </View>

        <View style={styles.actionsList}>
          {!!message.content && (
            <ActionLink size="bodySmall" onPress={handleCopy}>
              copiar texto
            </ActionLink>
          )}

          {onReply && (
            <ActionLink
              size="bodySmall"
              onPress={() => {
                onReply()
                onClose()
              }}
            >
              responder
            </ActionLink>
          )}

          {isAuthor && (
            <ActionLink
              size="bodySmall"
              onPress={() => {
                onClose()
                onEdit()
              }}
            >
              editar mensaje
            </ActionLink>
          )}

          {canDelete && (
            <ActionLink
              size="bodySmall"
              style={styles.deleteLink}
              onPress={() => {
                onClose()
                onDelete?.()
              }}
            >
              eliminar mensaje
            </ActionLink>
          )}
        </View>
      </ModalForm>
    </Modal>
  )
}

const useStyles = makeStyles(t => ({
  preview: {
    padding: t.space[3],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    backgroundColor: t.colors.background,
  },
  content: {
    fontStyle: 'italic',
  },
  actionsList: {
    gap: t.space[4],
    paddingTop: t.space[2],
  },
  deleteLink: {
    color: t.colors.danger,
  },
}))

