import React, { useEffect, useMemo, useRef } from 'react'
import { FlatList, Keyboard, Platform, View } from 'react-native'
import { formatDayLabel, placeMessage } from '@discordia/core'
import { makeStyles } from '../../theme'
import { EmptyState, Text } from '../../ui'
import type { Message } from '../../types'
import type { UserDisplay } from '../../hooks/useUserProfiles'
import MessageItem from './MessageItem'

interface MessageListProps {
  messages: Message[]
  describeUser: (userId: string) => UserDisplay
}

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: Message; grouped: boolean }

/** Antigüedad máxima de un mensaje que entra animado: lo que llega mientras se mira, no el historial. */
const NEW_WINDOW_MS = 10_000

/** Mensajes del canal, con los separadores por día ("hoy", "ayer") y agrupados por autor (las reglas de core). */
export default function MessageList({ messages, describeUser }: MessageListProps) {
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
      out.push({ kind: 'message', key: message.id, message, grouped })
    })
    return out
  }, [messages])

  if (messages.length === 0) {
    return (
      <View style={styles.empty}>
        <EmptyState title="todavía no hay mensajes" hint="escribí el primero" />
      </View>
    )
  }

  return (
    <FlatList
      ref={listRef}
      data={rows}
      keyExtractor={row => row.key}
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
          />
        )
      }
    />
  )
}

const useStyles = makeStyles(t => ({
  content: { paddingHorizontal: t.space[4], paddingBottom: t.space[4], flexGrow: 1, justifyContent: 'flex-end' },
  empty: { flex: 1, justifyContent: 'flex-end', padding: t.space[5] },
  day: { paddingTop: t.space[5], paddingLeft: t.layout.avatarSize.md + t.space[3] },
}))
