import React, { useState } from 'react'
import { Animated, Image, Linking, Pressable, View } from 'react-native'
import { formatAttachmentSize, formatMessageTime, mentionsToText } from '@discordia/core'
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
  /** Lo acaba de enviar quien mira: entra desde más abajo y más despacio, como si saliera de la barra de escritura. */
  sent?: boolean
  /** Nombre de un usuario mencionado. Las menciones se muestran como texto (`@nombre`, `@rol`). */
  mentionName?: (userId: string) => string
}

/**
 * Mensaje del chat (PDF, pág. 7): avatar cuadrado, autor en negrita y la fecha chica (20/10/25, 13:25),
 * y el texto grande. Los seguidos de una misma persona van agrupados.
 */
function MessageItem({ message, author, grouped = false, animate = false, sent = false, mentionName }: MessageItemProps) {
  const styles = useStyles()
  const reduce = useReducedMotion()
  // Se fija al montarse: al confirmarse deja de estar pendiente y la entrada no tiene que cambiar a mitad de camino
  const [justSent] = useState(sent)
  const enter = useRise({
    offset: distance(justSent ? 'toast' : 'rise', reduce),
    name: justSent ? 'slow' : 'base',
    enabled: animate || justSent,
  })

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
          {mentionsToText(message.content, { user: mentionName ?? (() => 'usuario'), role: () => 'rol' })}
          {message.edited && (
            <Text variant="meta" tone="muted">
              {' '}(editado)
            </Text>
          )}
        </Text>
        {message.attachments?.map((att) => {
          const isImage =
            att.type?.startsWith('image/') ||
            att.contentType?.startsWith('image/') ||
            /\.(jpe?g|png|webp|gif)$/i.test(att.name || att.url);
          if (isImage && att.url) {
            return (
              <Pressable
                key={att.id}
                onPress={() => Linking.openURL(att.url)}
                style={styles.imageWrapper}
                accessibilityRole="button"
                accessibilityLabel={`Ver imagen ${att.name}`}
              >
                <Image
                  source={{ uri: att.url }}
                  style={styles.attachmentImage}
                  resizeMode="cover"
                  accessibilityLabel={att.name}
                />
              </Pressable>
            );
          }
          return (
            <Pressable
              key={att.id}
              onPress={() => att.url && Linking.openURL(att.url)}
              style={styles.fileCard}
              accessibilityRole="link"
              accessibilityLabel={`Descargar archivo ${att.name}`}
            >
              <Text variant="meta" bold numberOfLines={1} style={styles.fileName}>
                📄 {att.name}
              </Text>
              <Text variant="meta" tone="muted">
                {formatAttachmentSize(att.size) || 'archivo'} • _descargar
              </Text>
            </Pressable>
          );
        })}
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
  imageWrapper: {
    marginTop: t.space[2],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    maxWidth: 260,
    maxHeight: 260,
  },
  attachmentImage: {
    width: 260,
    height: 180,
  },
  fileCard: {
    marginTop: t.space[2],
    padding: t.space[2],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    backgroundColor: t.colors.background,
  },
  fileName: {
    marginBottom: t.space[1],
  },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[1], marginTop: t.space[1] },
  // Reacciones en cajas de línea fina; la propia, invertida
  reaction: { paddingHorizontal: t.space[2], paddingVertical: 2, borderWidth: t.lines.hairline, borderColor: t.colors.lineStrong },
  reactionMine: { backgroundColor: t.colors.inverseBackground, borderColor: t.colors.inverseBackground },
}))
