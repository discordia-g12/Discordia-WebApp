import React from 'react'
import { View } from 'react-native'
import { friendRequestJoke, friendRequestTitle, messageRequestTitle, type FriendRequest } from '@discordia/core'
import { makeStyles } from '../../theme'
import { ActionLink, BlockButton, Text } from '../../ui'

interface FriendRequestCardProps {
  request: FriendRequest
  busy?: boolean
  onAccept: () => void
  onDecline: () => void
}

/** "X quiere ser tu amigo", con la descripción, el chiste y aceptar o rechazar. */
export function FriendRequestCard({ request, busy = false, onAccept, onDecline }: FriendRequestCardProps) {
  const styles = useStyles()
  return (
    <View style={styles.card}>
      <Text variant="heading">{friendRequestTitle(request.user.displayName)}</Text>
      {!!request.message && <Text variant="bodySmall">{request.message}</Text>}
      <Text variant="meta" tone="muted">
        / {friendRequestJoke(request.id)}
      </Text>
      <View style={styles.actions}>
        <BlockButton loading={busy} onPress={onAccept}>
          Aceptar
        </BlockButton>
        <ActionLink size="bodySmall" disabled={busy} onPress={onDecline}>
          rechazar
        </ActionLink>
      </View>
    </View>
  )
}

interface MessageRequestCardProps {
  name: string
  /** Lo último que escribió. */
  preview?: string
  busy?: boolean
  onAccept: () => void
  onDecline: () => void
  onBlock: () => void
  /** Sin esto no se ofrece: ya son amigos o ya hay una solicitud. */
  onAddFriend?: () => void
}

/** En lugar del composer: quien recibe una solicitud de mensaje no responde sin aceptar. Aceptar no los hace amigos. */
export function MessageRequestCard({ name, preview, busy = false, onAccept, onDecline, onBlock, onAddFriend }: MessageRequestCardProps) {
  const styles = useStyles()
  return (
    <View style={[styles.card, styles.docked]}>
      <Text variant="bodySmall" bold>
        {messageRequestTitle(name)}
      </Text>
      {!!preview && (
        <Text variant="meta" tone="muted" numberOfLines={2}>
          / {preview}
        </Text>
      )}
      <Text variant="meta" tone="muted">
        / si aceptás pueden escribirse, pero no quedan como amigos.
      </Text>
      <View style={styles.actions}>
        <BlockButton loading={busy} onPress={onAccept}>
          Aceptar
        </BlockButton>
        <ActionLink disabled={busy} onPress={onDecline}>
          rechazar
        </ActionLink>
        <ActionLink disabled={busy} onPress={onBlock}>
          bloquear
        </ActionLink>
        {onAddFriend && (
          <ActionLink disabled={busy} onPress={onAddFriend}>
            agregar amigo
          </ActionLink>
        )}
      </View>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  card: {
    gap: t.space[2],
    paddingVertical: t.space[4],
    paddingHorizontal: t.space[4],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.lineStrong,
  },
  docked: { borderBottomWidth: 0, borderTopWidth: t.lines.hairline, borderTopColor: t.colors.lineStrong },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: t.space[4], rowGap: t.space[2], marginTop: t.space[1] },
}))
