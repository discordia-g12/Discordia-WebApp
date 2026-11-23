import React, { useEffect, useState } from 'react'
import { BackHandler, View } from 'react-native'
import { Bell, BellOff } from 'lucide-react-native'
import {
  JUMP_NOT_FOUND_MESSAGE,
  errorMessageFor,
  replyCountLabel,
  useSendThreadReply,
  useThreadMute,
  useThreadQuery,
} from '@discordia/core'
import { makeStyles } from '../../theme'
import { ActionLink, IconButton, Skeleton, Text } from '../../ui'
import { useUI } from '../../providers/AppProviders'
import type { Message } from '../../types'
import type { UserDisplay } from '../../hooks/useUserProfiles'
import { Pane } from '../shell/ShellScreen'
import ChatHeader from './ChatHeader'
import Composer from './Composer'
import MessageItem from './MessageItem'
import MessageList from './MessageList'
import { quotePreview } from './ReplyQuote'

export interface OpenThread {
  channelId: string
  messageId: string
  /** null en un DM: se guarda con la preferencia, para limpiarla si se borra el servidor. */
  serverId: string | null
}

interface ThreadScreenProps {
  thread: OpenThread
  /** Dónde está el hilo, para volver ("•general", "Ana"). */
  locationLabel: string
  currentUserId: string
  describeUser: (userId: string) => UserDisplay
  /** Por qué no se puede escribir (silenciado, sin permiso), o null. El del canal: el hilo es del canal. */
  blockedMessage?: string | null
  onBack: () => void
  onPressAuthor?: (userId: string) => void
  /** Mantener presionado: las mismas acciones que en el canal (reaccionar, editar, borrar). */
  onLongPressMessage?: (message: Message) => void
  onToggleReaction?: (messageId: string, emoji: string) => void
  /** Mensaje al que se está respondiendo (lo elige el menú del mensaje, en MobileShell). */
  replyingTo?: Message | null
  onCancelReply?: () => void
  /** Elegir a qué mensaje responder (deslizarlo a la derecha). */
  onReplyMessage?: (message: Message) => void
}

/** Cuánto queda marcado el original al ir a él (lo mismo que en MessageList). */
const HIGHLIGHT_MS = 2000

const SEND_ERRORS = {
  400: 'No se puede responder a ese mensaje en un hilo.',
  403: 'No tenés permiso para responder en este hilo.',
  404: 'El mensaje original ya no existe.',
}

/**
 * Hilo de un mensaje (CA2, CA4): el original arriba como contexto, las respuestas y la barra para responder.
 * Lo mantienen al día el socket del canal (THREAD_REPLY_CREATED) y el inbox (en un DM), por el caché de core.
 */
export default function ThreadScreen({
  thread,
  locationLabel,
  currentUserId,
  describeUser,
  blockedMessage = null,
  onBack,
  onPressAuthor,
  onLongPressMessage,
  onToggleReaction,
  replyingTo = null,
  onCancelReply,
  onReplyMessage,
}: ThreadScreenProps) {
  const styles = useStyles()
  const { showToast } = useUI()
  const query = useThreadQuery(thread.channelId, thread.messageId)
  const send = useSendThreadReply(thread.channelId, thread.messageId)
  const mute = useThreadMute(thread.messageId, thread.serverId)
  const [draft, setDraft] = useState('')
  const [focusMessageId, setFocusMessageId] = useState<string | null>(null)
  const [rootHighlighted, setRootHighlighted] = useState(false)

  useEffect(() => {
    if (!rootHighlighted) return
    const timer = setTimeout(() => setRootHighlighted(false), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [rootHighlighted])

  // Las respuestas se cargan de la más vieja a la más nueva: la citada, que es anterior, ya está en la lista
  const jumpTo = (messageId: string) => {
    if (messageId === thread.messageId) setRootHighlighted(true)
    else if (!query.replies.some(m => m.id === messageId)) {
      showToast(JUMP_NOT_FOUND_MESSAGE, 'info')
      return
    }
    setFocusMessageId(messageId)
  }

  // Atrás en Android cierra el hilo y vuelve al canal
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack()
      return true
    })
    return () => subscription.remove()
  }, [onBack])

  const handleSend = () => {
    const content = draft.trim()
    if (!content) return
    setDraft('')
    const replyToId = replyingTo?.id
    onCancelReply?.()
    send(content, undefined, replyToId).catch(err => {
      setDraft(content)
      showToast(errorMessageFor(err, SEND_ERRORS, 'No se pudo enviar la respuesta'), 'error')
    })
  }

  const parent = query.parent
  const header = (
    <View style={styles.original} accessibilityLabel="Mensaje original">
      {parent ? (
        <MessageItem
          message={parent}
          author={describeUser(parent.authorId)}
          currentUserId={currentUserId}
          mentionName={id => describeUser(id).name}
          onPressAuthor={onPressAuthor}
          onLongPress={onLongPressMessage ? () => onLongPressMessage(parent) : undefined}
          onToggleReaction={onToggleReaction}
          highlighted={rootHighlighted}
          onReply={onReplyMessage ? () => onReplyMessage(parent) : undefined}
        />
      ) : (
        <Skeleton lines={2} label="Cargando el mensaje original" />
      )}
      <Text variant="meta" tone="muted" style={styles.count} accessibilityRole="header">
        {replyCountLabel(parent?.thread?.replyCount ?? query.replies.length)}
      </Text>
    </View>
  )

  const footer = query.hasMore ? (
    <View style={styles.more}>
      {query.isFetchingMore ? (
        <Text variant="meta" tone="muted" accessibilityLiveRegion="polite">
          / cargando respuestas…
        </Text>
      ) : (
        <ActionLink size="bodySmall" onPress={() => void query.fetchMore()}>
          cargar más respuestas
        </ActionLink>
      )}
    </View>
  ) : undefined

  return (
    <Pane backLabel={locationLabel} onBack={onBack}>
      <ChatHeader
        channelName="Hilo"
        direct
        status={`en ${locationLabel}`}
        actions={
          <IconButton
            icon={mute.muted ? BellOff : Bell}
            label={mute.muted ? 'Reactivar avisos del hilo' : 'Silenciar avisos del hilo'}
            pressed={mute.muted}
            onPress={() => {
              mute.setMuted(!mute.muted).catch(() => showToast('No se pudo cambiar el aviso del hilo', 'error'))
            }}
          />
        }
      />
      {query.isError ? (
        <View style={styles.error}>
          <Text tone="muted">No se pudo abrir el hilo.</Text>
          <ActionLink size="bodySmall" onPress={() => void query.refetch()}>
            reintentar
          </ActionLink>
        </View>
      ) : (
        <MessageList
          channelName="hilo"
          header={header}
          footer={footer}
          messages={query.replies}
          currentUserId={currentUserId}
          describeUser={describeUser}
          onPressAuthor={onPressAuthor}
          onLongPressMessage={onLongPressMessage}
          onToggleReaction={onToggleReaction}
          onPressQuote={jumpTo}
          onReplyMessage={onReplyMessage}
          headerMessageId={thread.messageId}
          focusMessageId={focusMessageId}
          onFocusDone={() => setFocusMessageId(null)}
        />
      )}
      <Composer
        channelName={locationLabel}
        placeholder="Responder en el hilo"
        value={draft}
        onChangeText={setDraft}
        onSend={handleSend}
        blockedMessage={blockedMessage}
        replyingTo={
          replyingTo && onCancelReply
            ? {
                ...quotePreview(replyingTo, id => describeUser(id).name),
                onPress: () => jumpTo(replyingTo.id),
                onCancel: onCancelReply,
              }
            : null
        }
      />
    </Pane>
  )
}

const useStyles = makeStyles(t => ({
  original: { gap: t.space[2], paddingBottom: t.space[3] },
  count: { paddingLeft: t.layout.avatarSize.md + t.space[3], paddingTop: t.space[2] },
  more: { alignItems: 'center', paddingVertical: t.space[3] },
  error: { gap: t.space[2], padding: t.space[4] },
}))
