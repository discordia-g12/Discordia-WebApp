import React from 'react'
import { Animated, View } from 'react-native'
import { formatMessageTime } from '@discordia/core'
import { makeStyles } from '../../theme'
import { SquareAvatar, Text, distance, useReducedMotion, useRise } from '../../ui'
import type { Message } from '../../types'
import type { UserDisplay } from '../../hooks/useUserProfiles'

interface MessageItemProps {
  message: Message
  author?: UserDisplay
  /** Sigue al anterior de la misma persona: sin avatar ni encabezado. */
  grouped?: boolean
  /** Mensaje nuevo (no del historial): entra subiendo. */
  animate?: boolean
}

/**
 * Mensaje del chat (PDF, pág. 7): avatar cuadrado, autor en negrita y la fecha chica (20/10/25, 13:25),
 * y el texto grande. Los seguidos de una misma persona van agrupados.
 */
function MessageItem({ message, author, grouped = false, animate = false }: MessageItemProps) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  const enter = useRise({ offset: distance('rise', reduce), name: 'base', enabled: animate })

  if (message.type === 'system') {
    return (
      <Text variant="meta" tone="muted" style={styles.system}>
        •{message.content} {formatMessageTime(message.timestamp)}
      </Text>
    )
  }

  const deleted = message.type === 'deleted'
  const pending = message.status === 'pending'
  const failed = message.status === 'failed'
  const name = author?.name ?? 'Usuario'

  return (
    <Animated.View style={[styles.row, grouped && styles.grouped, pending && styles.pending, enter]}>
      <View style={styles.gutter}>
        {!grouped && <SquareAvatar user={{ username: name, avatar: author?.avatar }} size="md" />}
      </View>
      <View style={styles.body}>
        {!grouped && (
          <View style={styles.meta}>
            <Text variant="meta" bold numberOfLines={1} style={styles.author}>
              {name}
            </Text>
            <Text variant="meta" tone="muted">
              {formatMessageTime(message.timestamp)}
            </Text>
          </View>
        )}
        <Text tone={deleted ? 'muted' : 'default'} style={deleted && styles.deleted}>
          {message.content}
          {message.edited && (
            <Text variant="meta" tone="muted">
              {' '}(editado)
            </Text>
          )}
        </Text>
        {(pending || failed) && (
          <Text variant="meta" tone={failed ? 'default' : 'muted'} bold={failed} accessibilityLiveRegion="polite">
            {failed ? '/ no se envió' : 'enviando/'}
          </Text>
        )}
        {!!message.reactions?.length && (
          <View style={styles.reactions}>
            {message.reactions.map(r => (
              <View key={r.emoji} style={[styles.reaction, r.reacted && styles.reactionMine]}>
                <Text variant="meta" tone={r.reacted ? 'inverse' : 'default'}>
                  {r.emoji} {r.count}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  )
}

// memo: en una lista larga, un mensaje nuevo no debería re-renderizar los anteriores
export default React.memo(MessageItem)

const useStyles = makeStyles(t => ({
  system: { paddingVertical: t.space[2], paddingLeft: t.layout.avatarSize.md + t.space[3] },
  row: { flexDirection: 'row', gap: t.space[3], paddingTop: t.space[4] },
  grouped: { paddingTop: t.space[1] },
  pending: { opacity: 0.6 },
  gutter: { width: t.layout.avatarSize.md },
  body: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'baseline', gap: t.space[2] },
  author: { flexShrink: 1 },
  deleted: { fontStyle: 'italic' },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[1], marginTop: t.space[1] },
  // Reacciones en cajas de línea fina; la propia, invertida
  reaction: { paddingHorizontal: t.space[2], paddingVertical: 2, borderWidth: t.lines.hairline, borderColor: t.colors.lineStrong },
  reactionMine: { backgroundColor: t.colors.inverseBackground, borderColor: t.colors.inverseBackground },
}))
