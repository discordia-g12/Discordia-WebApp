import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Keyboard, Platform, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { formatDayLabel, placeMessage } from '@discordia/core'
import { makeStyles } from '../../theme'
import { ActionLink, EmptyState, Text } from '../../ui'
import type { Message } from '../../types'
import type { UserDisplay } from '../../hooks/useUserProfiles'
import MessageItem from './MessageItem'

interface MessageListProps {
  channelName: string
  /** El comienzo de la lista. Por defecto, el del canal. */
  welcomeTitle?: string
  welcomeHint?: string
  messages: Message[]
  currentUserId?: string
  describeUser: (userId: string) => UserDisplay
  /** Hay mensajes anteriores a los cargados: arriba se ofrece cargarlos en vez del comienzo del canal. */
  hasOlder?: boolean
  loadingOlder?: boolean
  /** Pide la página anterior del historial (al llegar arriba o con el enlace). */
  onLoadOlder?: () => void
  /** Tocar el autor de un mensaje. */
  onPressAuthor?: (userId: string) => void
  /** Mantener presionado: acciones sobre el mensaje (editar). */
  onLongPressMessage?: (message: Message) => void
  /** Tocar una reacción para alternarla. */
  onToggleReaction?: (messageId: string, emoji: string) => void
  /**
   * Mensaje al que hay que ir (desde los fijados), ya cargado: se centra y se marca un momento. Al llegar se
   * llama a onFocusDone para que quien lo pidió lo limpie.
   */
  focusMessageId?: string | null
  onFocusDone?: () => void
}

type Row =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: Message; grouped: boolean }

/** Antigüedad máxima de un mensaje que entra animado: lo que llega mientras se mira, no el historial. */
const NEW_WINDOW_MS = 10_000
/** Distancia al final (en puntos) que todavía cuenta como "estar abajo". */
const NEAR_END = 80
/** Tiempo desde los primeros mensajes en que la lista todavía se está armando. */
const SETTLE_MS = 1000
/** Cuánto queda marcado el mensaje al que se fue. */
const HIGHLIGHT_MS = 2000
/** Reintentos de scrollToIndex mientras FlatList todavía no dibujó la fila (sin getItemLayout no la conoce). */
const MAX_FOCUS_RETRIES = 5

/**
 * Mensajes del canal, con los separadores por día ("hoy", "ayer") y agrupados por autor (las reglas de core).
 * Como en la web, arrancan arriba, debajo del comienzo del canal, y bajan a medida que llegan: con pocos
 * mensajes no quedan pegados a la barra de escritura. Los mensajes anteriores se cargan al llegar arriba,
 * sin mover lo que se está leyendo.
 */
export default function MessageList({
  channelName,
  welcomeTitle,
  welcomeHint,
  messages,
  currentUserId,
  describeUser,
  hasOlder = false,
  loadingOlder = false,
  onLoadOlder,
  onPressAuthor,
  onLongPressMessage,
  onToggleReaction,
  focusMessageId,
  onFocusDone,
}: MessageListProps) {
  const styles = useStyles()
  const listRef = useRef<FlatList<Row>>(null)
  const openedAt = useRef(Date.now())
  // Pegada al final: mientras sea true, cada cambio de tamaño baja hasta el último mensaje. Un solo
  // scrollToEnd no alcanza: FlatList dibuja las filas de a tandas y la lista sigue creciendo después.
  // Se suelta cuando el usuario sube a leer y se vuelve a pegar al llegar abajo o al enviar.
  const stickToEnd = useRef(true)
  const lastOffset = useRef(0)
  // Cuándo llegaron los primeros mensajes. Hasta un rato después se baja sin animar: es la lista
  // armándose al abrir, y animarla recorrería todo el historial.
  const firstRowsAt = useRef<number | null>(null)
  // Último mensaje propio que ya hizo bajar la lista
  const sentKey = useRef<string | null>(null)
  // Al abrir, la lista arranca arriba y baja sola: eso no tiene que pedir mensajes anteriores
  const userScrolled = useRef(false)
  const loadOlder = () => {
    if (hasOlder && !loadingOlder) onLoadOlder?.()
  }

  const scrollToEnd = () => {
    if (!stickToEnd.current) return
    const settled = firstRowsAt.current !== null && Date.now() - firstRowsAt.current > SETTLE_MS
    listRef.current?.scrollToEnd({ animated: settled })
  }

  // Al abrirse el teclado, volver a mostrar el último mensaje
  useEffect(() => {
    const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const sub = Keyboard.addListener(eventName, () => {
      stickToEnd.current = true
      setTimeout(scrollToEnd, 100)
    })
    return () => sub.remove()
  }, [])

  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent
    const toEnd = contentSize.height - layoutMeasurement.height - contentOffset.y
    // Solo un scroll hacia arriba la suelta: bajar por código o que crezca el contenido no lo es.
    // En la web no hay onScrollBeginDrag con la rueda del mouse, por eso se mira el desplazamiento.
    if (contentOffset.y < lastOffset.current - 1) {
      userScrolled.current = true
      if (toEnd > NEAR_END) stickToEnd.current = false
    }
    if (toEnd <= NEAR_END) stickToEnd.current = true
    lastOffset.current = contentOffset.y
  }

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

  // Ir a un mensaje (desde los fijados). Sin animar: un scroll animado pasa cerca del final, la lista se vuelve
  // a pegar y onContentSizeChange la baja otra vez
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const focusRetries = useRef(0)
  const scrollToRow = (index: number) => {
    stickToEnd.current = false
    listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: false })
  }
  const onFocusDoneRef = useRef(onFocusDone)
  useEffect(() => {
    onFocusDoneRef.current = onFocusDone
  })
  useEffect(() => {
    if (!focusMessageId) return
    const index = rows.findIndex(row => row.kind === 'message' && row.message.id === focusMessageId)
    // Todavía no llegó a la lista (la página recién cargada): vuelve a correr cuando cambien las filas
    if (index === -1) return
    focusRetries.current = 0
    scrollToRow(index)
    // Se marca (y se avisa que llegó) en el cuadro siguiente, con el scroll ya hecho
    const frame = requestAnimationFrame(() => {
      setHighlighted(focusMessageId)
      onFocusDoneRef.current?.()
    })
    return () => cancelAnimationFrame(frame)
  }, [focusMessageId, rows])
  useEffect(() => {
    if (!highlighted) return
    const timer = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [highlighted])

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
        {welcomeTitle ?? `•${channelName}`}
      </Text>
      <Text variant="meta" tone="muted">
        / {welcomeHint ?? `este es el comienzo del canal •${channelName}.`}
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
        if (rows.length > 0 && firstRowsAt.current === null) firstRowsAt.current = Date.now()
        // Enviar un mensaje baja hasta el final aunque se estuviera leyendo más arriba. Solo los propios
        // (los del envío optimista) tienen status; los que llegan de otros no.
        const last = rows[rows.length - 1]
        if (last?.kind === 'message' && last.message.status && last.key !== sentKey.current) {
          sentKey.current = last.key
          stickToEnd.current = true
        }
        scrollToEnd()
      }}
      // El alto de la lista cambia con el teclado o el composer de varias líneas
      onLayout={scrollToEnd}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onScrollBeginDrag={() => {
        userScrolled.current = true
      }}
      onStartReached={() => {
        if (userScrolled.current) loadOlder()
      }}
      onStartReachedThreshold={0.5}
      // Al agregar mensajes arriba, lo visible queda en su lugar
      maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      extraData={highlighted}
      // La fila a la que se quiere ir está fuera de lo dibujado: se acerca con el alto promedio y se reintenta
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        stickToEnd.current = false
        listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: false })
        if (focusRetries.current >= MAX_FOCUS_RETRIES) return
        focusRetries.current += 1
        setTimeout(() => scrollToRow(index), 100)
      }}
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
            currentUserId={currentUserId}
            mentionName={id => describeUser(id).name}
            grouped={item.grouped}
            animate={new Date(item.message.timestamp).getTime() > openedAt.current - NEW_WINDOW_MS}
            sent={item.message.status === 'pending'}
            onPressAuthor={onPressAuthor}
            onLongPress={onLongPressMessage ? () => onLongPressMessage(item.message) : undefined}
            onToggleReaction={onToggleReaction}
            highlighted={highlighted === item.message.id}
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
