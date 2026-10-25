import React, { useEffect, useMemo, useRef } from 'react'
import { FlatList, Keyboard, Platform, View } from 'react-native'
import { formatDayLabel, placeMessage } from '@discordia/core'
import { makeStyles } from '../../theme'
import { EmptyState, Text } from '../../ui'
import type { Message } from '../../types'
import type { UserDisplay } from '../../hooks/useUserProfiles'
import MessageItem from './MessageItem'

interface MessageListProps {
  channelName: string
  messages: Message[]
  describeUser: (userId: string) => UserDisplay
}

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: Message; grouped: boolean }

/** Antigüedad máxima de un mensaje que entra animado: lo que llega mientras se mira, no el historial. */
const NEW_WINDOW_MS = 10_000

/**
 * Mensajes del canal, con los separadores por día ("hoy", "ayer") y agrupados por autor (las reglas de core).
 * Como en la web, arrancan arriba, debajo del comienzo del canal, y bajan a medida que llegan: con pocos
 * mensajes no quedan pegados a la barra de escritura.
 */
export default function MessageList({ channelName, messages, describeUser }: MessageListProps) {
  const styles = useStyles()
  const listRef = useRef<FlatList<Row>>(null)
  const openedAt = useRef(Date.now())

  // Al abrirse el teclado, volver a mostrar el último mensaje
  useEffect(() => {
    const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const sub = Keyboard.addListener(eventName, () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    })
    return () => sub.remove()
  }, [])

  const rows = useMemo(() => {
    const out: Row[] = []
    messages.forEach((message, i) => {
      const prev = i > 0 ? messages[i - 1] : null
      const line = (m: Message) => ({ authorId: m.authorId, timestamp: m.timestamp, type: m.type })
      const { newDay, grouped } = placeMessage(prev && line(prev), line(message))
      if (newDay) out.push({ kind: 'day', key: `day-${newDay.toDateString()}`, label: formatDayLabel(newDay) })
      out.push({ kind: 'message', key: message.localId ?? message.id, message, grouped })
    })
    return out
  }, [messages])

  // El comienzo del canal, como en la web: "•general" en grande y la bajada
  const welcome = (
    <View style={styles.welcome}>
      <Text variant="display" style={styles.welcomeTitle}>
        •{channelName}
      </Text>
      <Text variant="meta" tone="muted">
        / este es el comienzo del canal •{channelName}.
      </Text>
      {messages.length === 0 && <EmptyState title="todavía no hay mensajes" hint="escribí el primero" />}
    </View>
  )

  return (
    <FlatList
      ref={listRef}
      data={rows}
      keyExtractor={row => row.key}
      ListHeaderComponent={welcome}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      renderItem={({ item }) =>
        item.kind === 'day' ? (
          <View style={styles.day} accessibilityRole="header">
            <Text variant="meta" tone="muted">
              {item.label}
            </Text>
          </View>
        ) : (
          <MessageItem
            message={item.message}
            author={describeUser(item.message.authorId)}
            grouped={item.grouped}
            animate={new Date(item.message.timestamp).getTime() > openedAt.current - NEW_WINDOW_MS}
            sent={item.message.status === 'pending'}
          />
        )
      }
    />
  )
}

const useStyles = makeStyles(t => ({
  content: { paddingHorizontal: t.space[4], paddingTop: t.space[5], paddingBottom: t.space[4] },
  welcome: { gap: t.space[2], paddingLeft: t.layout.avatarSize.md + t.space[3], paddingBottom: t.space[3] },
  // El display tiene interlineado < 1: en iOS cortaría el borde de arriba de las mayúsculas
  welcomeTitle: { lineHeight: Math.round(t.text.display.fontSize * 1.1) },
  day: { paddingTop: t.space[5], paddingLeft: t.layout.avatarSize.md + t.space[3] },
}))
