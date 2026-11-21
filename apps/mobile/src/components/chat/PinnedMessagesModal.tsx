import React from 'react'
import { View } from 'react-native'
import { formatMessageTime, mentionsToText, usePinnedMessagesQuery } from '@discordia/core'
import { makeStyles } from '../../theme'
import { ActionLink, Modal, ModalForm, Skeleton, Text } from '../../ui'
import type { UserDisplay } from '../../hooks/useUserProfiles'
import type { Message } from '../../types'

interface PinnedMessagesModalProps {
  visible: boolean
  /** Canal o DM (`dm-…`). */
  channelId: string | null
  describeUser: (userId: string) => UserDisplay
  /** Si puede desfijar (canPinMessages de core). */
  canPin: boolean
  onUnpin: (message: Message) => void
  onClose: () => void
}

/** Mensajes fijados de un canal o DM: los mismos para los dos, con los de páginas que no se cargaron. */
export default function PinnedMessagesModal({ visible, channelId, describeUser, canPin, onUnpin, onClose }: PinnedMessagesModalProps) {
  const styles = useStyles()
  const pinned = usePinnedMessagesQuery(channelId, { enabled: visible })
  const list = pinned.data ?? []
  const mentionName = (id: string) => describeUser(id).name

  return (
    <Modal visible={visible} title="Fijados" onClose={onClose}>
      <ModalForm>
        {pinned.isLoading ? (
          <Skeleton lines={3} label="Cargando los mensajes fijados" />
        ) : list.length === 0 ? (
          <Text variant="bodySmall" tone="muted">
            / todavía no hay mensajes fijados en esta conversación.
          </Text>
        ) : (
          list.map(message => (
            <View key={message.id} style={styles.item}>
              <View style={styles.meta}>
                <Text variant="meta" bold numberOfLines={1} style={styles.author}>
                  {describeUser(message.authorId).name}
                </Text>
                <Text variant="meta" tone="muted">
                  {formatMessageTime(message.timestamp)}
                </Text>
              </View>
              <Text variant="bodySmall" numberOfLines={4}>
                {mentionsToText(message.content, { user: mentionName, role: () => 'rol' })}
              </Text>
              {canPin && (
                <ActionLink size="bodySmall" onPress={() => onUnpin(message)}>
                  desfijar
                </ActionLink>
              )}
            </View>
          ))
        )}
      </ModalForm>
    </Modal>
  )
}

const useStyles = makeStyles(t => ({
  item: {
    gap: t.space[1],
    paddingVertical: t.space[3],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: t.space[2],
  },
  author: {
    flexShrink: 1,
  },
}))
