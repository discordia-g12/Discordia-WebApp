import React, { useEffect, useMemo, useRef } from 'react'
import { FlatList, Keyboard, Platform, View } from 'react-native'
import { formatDayLabel, placeMessage } from '@discordia/core'
import { makeStyles } from '../../theme'
import { ActionLink, EmptyState, Text } from '../../ui'
import type { Message } from '../../types'
import type { UserDisplay } from '../../hooks/useUserProfiles'
import MessageItem from './MessageItem'

interface MessageListProps {
  channelName: string
  messages: Message[]
  describeUser: (userId: string) => UserDisplay
  /** Hay mensajes anteriores a los cargados: arriba se ofrece cargarlos en vez del comienzo del canal. */
  hasOlder?: boolean
  loadingOlder?: boolean
  /** Pide la página anterior del historial (al llegar arriba o con el enlace). */
  onLoadOlder?: () => void
}

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: Message; grouped: boolean }

/** Antigüedad máxima de un mensaje que entra animado: lo que llega mientras se mira, no el historial. */
const NEW_WINDOW_MS = 10_000

/**
 * Mensajes del canal, con los separadores por día ("hoy", "ayer") y agrupados por autor (las reglas de core).
 * Como en la web, arrancan arriba, debajo del comienzo del canal, y bajan a medida que llegan: con pocos
 * mensajes no quedan pegados a la barra de escritura. Los mensajes anteriores se cargan al llegar arriba,
 * sin mover lo que se está leyendo.
 */
export default function MessageList({
  channelName,
  messages,
  describeUser,
  hasOlder = false,
  loadingOlder = false,
  onLoadOlder,
}: MessageListProps) {
  const styles = useStyles()
  const listRef = useRef<FlatList<Row>>(null)
  const openedAt = useRef(Date.now())
  // Último mensaje al que ya se bajó: cargar mensajes anteriores no debe bajar hasta el final
  const scrolledToKey = useRef<string | null>(null)
  // Al abrir, la lista arranca arriba y baja sola: eso no tiene que pedir mensajes anteriores
  const userScrolled = useRef(false)
  const loadOlder = () => {
    if (hasOlder && !loadingOlder) onLoadOlder?.()
  }

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

  // Mientras haya mensajes anteriores sin cargar, arriba va eso en vez del comienzo del canal
  const older = (
    <View style={styles.older}>
      {loadingOlder ? (
        <Text variant="meta" tone="muted">
          / cargando mensajes anteriores…
        </Text>
      ) : (
        <ActionLink onPress={loadOlder}>cargar mensajes anteriores</ActionLink>
      )}
    </View>
  )

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
      ListHeaderComponent={hasOlder ? older : welcome}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      onContentSizeChange={() => {
        const lastKey = rows[rows.length - 1]?.key ?? null
        if (lastKey === scrolledToKey.current) return
        scrolledToKey.current = lastKey
        listRef.current?.scrollToEnd({ animated: true })
      }}
      onScrollBeginDrag={() => {
        userScrolled.current = true
      }}
      onStartReached={() => {
        if (userScrolled.current) loadOlder()
      }}
      onStartReachedThreshold={0.5}
      // Al agregar mensajes arriba, lo visible queda en su lugar
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
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
            mentionName={id => describeUser(id).name}
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
  older: { paddingLeft: t.layout.avatarSize.md + t.space[3], paddingBottom: t.space[3] },
  day: { paddingTop: t.space[5], paddingLeft: t.layout.avatarSize.md + t.space[3] },
}))
