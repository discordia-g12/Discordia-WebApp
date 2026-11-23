import React, { useEffect, useState } from 'react'
import { BackHandler, View } from 'react-native'
import { Bell, BellOff } from 'lucide-react-native'
import { errorMessageFor, replyCountLabel, useSendThreadReply, useThreadMute, useThreadQuery } from '@discordia/core'
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
}

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
}: ThreadScreenProps) {
  const styles = useStyles()
  const { showToast } = useUI()
  const query = useThreadQuery(thread.channelId, thread.messageId)
  const send = useSendThreadReply(thread.channelId, thread.messageId)
  const mute = useThreadMute(thread.messageId, thread.serverId)
  const [draft, setDraft] = useState('')

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
    send(content).catch(err => {
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
        />
      )}
      <Composer
        channelName={locationLabel}
        placeholder="Responder en el hilo"
        value={draft}
        onChangeText={setDraft}
        onSend={handleSend}
        blockedMessage={blockedMessage}
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
