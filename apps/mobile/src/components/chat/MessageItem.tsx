import React, { useState } from 'react'
import { Animated, Image, Linking, Pressable, View } from 'react-native'
import {
  WAVE_EMOJI,
  formatAttachmentSize,
  formatMessageTime,
  hasThreadReplies,
  hasWaved,
  isMemberJoin,
  memberJoinText,
  mentionsToText,
  systemMessageUserId,
  threadSummaryLabel,
  waveCount,
} from '@discordia/core'
import { makeStyles } from '../../theme'
import { SquareAvatar, Text, distance, useReducedMotion, useRise } from '../../ui'
import type { Message } from '../../types'
import type { UserDisplay } from '../../hooks/useUserProfiles'

interface MessageItemProps {
  message: Message
  author?: UserDisplay
  currentUserId?: string
  /** Sigue al anterior de la misma persona: sin avatar ni encabezado. */
  grouped?: boolean
  /** Mensaje nuevo (no del historial): entra subiendo. */
  animate?: boolean
  /** Lo acaba de enviar quien mira: entra desde más abajo y más despacio, como si saliera de la barra de escritura. */
  sent?: boolean
  /** Nombre de un usuario mencionado. Las menciones se muestran como texto (`@nombre`, `@rol`). */
  mentionName?: (userId: string) => string
  /** Tocar el avatar o el nombre (estable: la fila está en memo). */
  onPressAuthor?: (userId: string) => void
  /** Mantener presionado: acciones sobre el mensaje (editar). */
  onLongPress?: () => void
  /** Tocar una reacción para alternarla. */
  onToggleReaction?: (messageId: string, emoji: string) => void
  /** Se acaba de ir a este mensaje (desde los fijados): se marca un momento. */
  highlighted?: boolean
  /** Abre el hilo (el resumen "3 respuestas"). Sin esto, dentro de un hilo, no se muestra. */
  onOpenThread?: (message: Message) => void
}

/**
 * Mensaje del chat (PDF, pág. 7): avatar cuadrado, autor en negrita y la fecha chica (20/10/25, 13:25),
 * y el texto grande. Los seguidos de una misma persona van agrupados.
 */
function MessageItem({
  message,
  author,
  currentUserId,
  grouped = false,
  animate = false,
  sent = false,
  mentionName,
  onPressAuthor,
  onLongPress,
  onToggleReaction,
  highlighted = false,
  onOpenThread,
}: MessageItemProps) {
  const styles = useStyles()
  // CA3: cuántas respuestas tiene y cuándo fue la última; tocarlo abre el hilo
  const threadSummary =
    onOpenThread && hasThreadReplies(message) ? (
      <Pressable
        onPress={() => onOpenThread(message)}
        accessibilityRole="button"
        accessibilityLabel={`Abrir hilo: ${threadSummaryLabel(message.thread)}`}
        hitSlop={8}
      >
        <Text variant="meta" tone="muted" style={styles.threadSummary}>
          {threadSummaryLabel(message.thread)}
        </Text>
      </Pressable>
    ) : null
  const reduce = useReducedMotion()
  // Se fija al montarse: al confirmarse deja de estar pendiente y la entrada no tiene que cambiar a mitad de camino
  const [justSent] = useState(sent)
  const enter = useRise({
    offset: distance(justSent ? 'toast' : 'rise', reduce),
    name: justSent ? 'slow' : 'base',
    enabled: animate || justSent,
  })

  if (message.type === 'system') {
    if (isMemberJoin(message)) {
      return (
        <MemberJoinRow
          message={message}
          name={author?.name}
          currentUserId={currentUserId}
          onPressAuthor={onPressAuthor}
          onWave={onToggleReaction ? () => onToggleReaction(message.id, WAVE_EMOJI) : undefined}
        />
      )
    }
    return (
      <Text variant="meta" tone="muted" style={styles.system}>
        •{message.content} {formatMessageTime(message.timestamp)}
      </Text>
    )
  }

  if (message.type === 'deleted') {
    return (
      <Animated.View style={[styles.row, styles.grouped, enter]}>
        <View style={styles.gutter} />
        <View style={styles.body}>
          <Text variant="meta" tone="muted" style={styles.deleted}>
            / este mensaje fue eliminado
          </Text>
          {threadSummary}
        </View>
      </Animated.View>
    )
  }

  const pending = message.status === 'pending'
  const failed = message.status === 'failed'
  const name = author?.name ?? 'Usuario'
  const authorPress = onPressAuthor
    ? {
        onPress: () => onPressAuthor(message.authorId),
        accessibilityRole: 'button' as const,
        accessibilityLabel: `Ver el perfil de ${name}`,
      }
    : { disabled: true }

  return (
    <Animated.View style={[styles.row, grouped && styles.grouped, pending && styles.pending, highlighted && styles.highlighted, enter]}>
      <View style={styles.gutter}>
        {!grouped && (
          <Pressable {...authorPress}>
            <SquareAvatar user={{ username: name, avatar: author?.avatar }} size="md" />
          </Pressable>
        )}
      </View>
      <Pressable style={styles.body} onLongPress={onLongPress} delayLongPress={250}>
        {!grouped && (
          <View style={styles.meta}>
            <Pressable style={styles.author} {...authorPress}>
              <Text variant="meta" bold numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
            <Text variant="meta" tone="muted">
              {formatMessageTime(message.timestamp)}
            </Text>
          </View>
        )}
        {message.isPinned && (
          <Text variant="meta" tone="muted">
            / fijado
          </Text>
        )}
        <Text>
          {mentionsToText(message.content, { user: mentionName ?? (() => 'usuario'), role: () => 'rol' })}
          {(message.edited || message.editedTimestamp) && (
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
            {message.reactions.map(r => {
              const hasReacted = Boolean(
                r.reacted || r.hasReacted || (currentUserId && r.users?.includes(currentUserId))
              )
              return (
                <Pressable
                  key={r.emoji}
                  style={[styles.reaction, hasReacted && styles.reactionMine]}
                  onPress={() => onToggleReaction?.(message.id, r.emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.emoji} ${r.count}`}
                >
                  <Text variant="meta" tone={hasReacted ? 'inverse' : 'default'}>
                    {r.emoji} {r.count}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        )}
        {threadSummary}
      </Pressable>
    </Animated.View>
  )
}

// memo: en una lista larga, un mensaje nuevo no debería re-renderizar los anteriores
export default React.memo(MessageItem)

/**
 * "se unió Ana, _saludalo_", como en la web: el nombre actual (abre el perfil) y saludar deja un 👋 en el
 * aviso. Ya saludado dice "saludaste"; sin `onWave`, "saludalo" queda como texto.
 */
function MemberJoinRow({
  message,
  name,
  currentUserId,
  onPressAuthor,
  onWave,
}: {
  message: Message
  name?: string
  currentUserId?: string
  onPressAuthor?: (userId: string) => void
  onWave?: () => void
}) {
  const styles = useStyles()
  const userId = systemMessageUserId(message)
  const text = memberJoinText(name || 'alguien', userId === currentUserId)
  const waved = currentUserId ? hasWaved(message, currentUserId) : false
  const waves = waveCount(message)

  return (
    <Text variant="meta" tone="muted" style={styles.system}>
      •{text.before}
      {text.name ? (
        <Text variant="meta" bold onPress={onPressAuthor ? () => onPressAuthor(userId) : undefined} accessibilityRole="link">
          {text.name}
        </Text>
      ) : null}
      {text.after}
      {text.waveLabel ? (
        waved ? (
          'saludaste'
        ) : onWave ? (
          <Text variant="meta" bold onPress={onWave} accessibilityRole="button" accessibilityLabel={`Saludar a ${text.name}`}>
            _{text.waveLabel}
          </Text>
        ) : (
          text.waveLabel
        )
      ) : null}
      {waves > 0 ? ` ${WAVE_EMOJI} ${waves}` : ''} {formatMessageTime(message.timestamp)}
    </Text>
  )
}

const useStyles = makeStyles(t => ({
  system: { paddingVertical: t.space[2], paddingLeft: t.layout.avatarSize.md + t.space[3] },
  row: { flexDirection: 'row', gap: t.space[3], paddingTop: t.space[4] },
  grouped: { paddingTop: t.space[1] },
  pending: { opacity: 0.6 },
  // Barra a la izquierda, como una mención en la web
  highlighted: {
    backgroundColor: t.colors.line,
    borderLeftWidth: t.lines.accent,
    borderLeftColor: t.colors.text,
    marginLeft: -t.space[2],
    paddingLeft: t.space[2] - t.lines.accent,
  },
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
  threadSummary: { marginTop: t.space[1], textDecorationLine: 'underline' },
  // Reacciones en cajas de línea fina; la propia, invertida
  reaction: { paddingHorizontal: t.space[2], paddingVertical: 2, borderWidth: t.lines.hairline, borderColor: t.colors.lineStrong },
  reactionMine: { backgroundColor: t.colors.inverseBackground, borderColor: t.colors.inverseBackground },
}))
