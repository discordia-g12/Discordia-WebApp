import React from 'react'
import { Pressable, View } from 'react-native'
import { mentionsToText } from '@discordia/core'
import { makeStyles } from '../../theme'
import type { Message } from '../../types'
import { Text } from '../../ui'

interface ReplyQuoteProps {
  /** "@Ana" en el mensaje; "respondiendo a @Ana" en la barra de escritura. */
  author: string
  text: string
  /** Tocar la cita: ir al mensaje citado. */
  onPress?: () => void
  /** Solo en la barra de escritura: dejar de responder. */
  onCancel?: () => void
}

/** Cita del mensaje al que se responde (en el mensaje y en la barra de escritura), como en WhatsApp. */
export default function ReplyQuote({ author, text, onPress, onCancel }: ReplyQuoteProps) {
  const styles = useStyles()
  return (
    <View style={styles.quote}>
      <Pressable
        style={styles.body}
        onPress={onPress}
        disabled={!onPress}
        hitSlop={4}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `Ir al mensaje citado: ${author}` : undefined}
      >
        <Text variant="meta" bold numberOfLines={1} style={styles.author}>
          {author}
        </Text>
        <Text variant="meta" tone="muted" numberOfLines={1}>
          {text || 'archivo adjunto'}
        </Text>
      </Pressable>
      {onCancel && (
        <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancelar respuesta">
          <Text variant="meta" bold tone="muted">
            ✕
          </Text>
        </Pressable>
      )}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  quote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2],
    marginVertical: t.space[1],
    paddingVertical: t.space[2],
    paddingHorizontal: t.space[3],
    borderLeftWidth: t.lines.accent,
    borderLeftColor: t.colors.accent,
    backgroundColor: t.colors.skyTint,
  },
  body: { flex: 1, minWidth: 0 },
  author: { color: t.colors.accent },
}))

/** Lo que muestra la cita de un mensaje: "@autor" y su texto en una línea. */
export function quotePreview(message: Pick<Message, 'authorId' | 'content'>, nameOf: (userId: string) => string) {
  return {
    author: `@${nameOf(message.authorId)}`,
    text: mentionsToText(message.content, { user: nameOf, role: () => 'rol' }),
  }
}
