import React, { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import {
  DM_HEADER_COMPACT_ICONS,
  dmHeaderActions,
  uploadAttachment,
  useAutoMarkChannelRead,
  useFriendRequestsQuery,
  usePresenceQuery,
  type DmHeaderAction,
  type DmHeaderActionId,
  type MessageAttachment,
} from '@discordia/core'
import { useAppActive } from '../../hooks/useAppActive'
import { useDmConversation, useDmMessages } from '../../hooks/useDmConversation'
import { usePickAttachment } from '../../hooks/usePickAttachment'
import { useRelationshipActions } from '../../hooks/useRelationshipActions'
import { useUserDisplay } from '../../hooks/useUserProfiles'
import { useData, useUI } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { ACTION_ICONS, IconButton, Skeleton } from '../../ui'
import ChatHeader from '../chat/ChatHeader'
import Composer, { type PendingAttachment } from '../chat/Composer'
import MessageList from '../chat/MessageList'
import ConfirmModal from '../shared/ConfirmModal'
import { MoreMenu } from '../shared/MoreMenu'
import { Pane } from '../shell/ShellScreen'
import type { Message } from '../../types'
import { ListStatus } from './ListStatus'
import { FriendRequestCard, MessageRequestCard } from './RequestCards'

const MAX_MESSAGE_LENGTH = 2000

interface DmChatScreenProps {
  userId: string
  /** Socket inbox conectado: al volver a conectarse se recupera lo que llegó mientras tanto. */
  inboxConnected: boolean
  onBack: () => void
  onOpenProfile: (userId: string) => void
  onLongPressMessage?: (message: Message) => void
  /** Llamar a la persona; el botón se ofrece solo si se le puede escribir (dmActions().canCall). */
  onCall?: (conversationId: string, name: string) => void
  /** Conversación de la llamada en curso (si es esta, no se ofrece llamar: la barra de la llamada tiene cortar). */
  callConversationId?: string | null
}

/**
 * Chat directo. Abrirlo no crea nada: la conversación nace con el primer mensaje, y hasta entonces no se ofrece
 * adjuntar. El estado de la relación decide qué va en el encabezado, arriba del historial y en lugar del composer.
 */
export default function DmChatScreen({ userId, inboxConnected, onBack, onOpenProfile, onLongPressMessage, onCall, callConversationId }: DmChatScreenProps) {
  const styles = useStyles()
  const { showToast } = useUI()
  const { currentUserId, toggleReaction } = useData()
  const appActive = useAppActive()
  const pickAttachment = usePickAttachment()
  const { profileQuery, withQuery, conversation, actions } = useDmConversation(userId)
  const { messages, history, send, refresh } = useDmMessages(userId, conversation)
  const profile = profileQuery.data
  const relation = useRelationshipActions(userId, profile)
  const { data: friendRequests } = useFriendRequestsQuery()
  const { data: presence } = usePresenceQuery([userId])
  const describeUser = useUserDisplay([userId, ...messages.map(m => m.authorId)])
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)

  const name = profile?.displayName ?? describeUser(userId).name
  const friendRequest = actions.canRespondFriendRequest
    ? friendRequests?.incoming.find(r => r.user.id === (profile?.id ?? userId))
    : undefined
  const conversationId = conversation?.id ?? null
  const lastMessageId = messages.filter(m => !m.id.startsWith('temp-')).at(-1)?.id

  useAutoMarkChannelRead(conversationId, lastMessageId, { enabled: appActive })

  // Volvió el inbox: lo que llegó durante el corte no pasó por el socket
  const wasConnected = useRef(inboxConnected)
  useEffect(() => {
    if (inboxConnected && !wasConnected.current && conversationId) refresh()
    wasConnected.current = inboxConnected
  }, [inboxConnected, conversationId, refresh])

  const pick = async () => {
    const picked = await pickAttachment()
    if (picked) setAttachment(picked)
  }

  const handleSend = async () => {
    const trimmed = draft.trim()
    if ((!trimmed && !attachment) || uploading) return
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      showToast('El mensaje no puede superar los 2000 caracteres.', 'error')
      return
    }

    let attachments: MessageAttachment[] | undefined
    if (attachment && conversationId) {
      setUploading(true)
      try {
        attachments = [await uploadAttachment(conversationId, attachment)]
      } catch (err) {
        showToast((err instanceof Error && err.message) || 'No se pudo subir el archivo.', 'error')
        return
      } finally {
        setUploading(false)
      }
    }

    setDraft('')
    setAttachment(null)
    await send(trimmed, attachments)
  }

  const handleRemoveFriend = async () => {
    setRemoveConfirmOpen(false)
    await relation.removeFriend()
  }

  const handleBlock = async () => {
    const fromRequest = actions.canRespondMessageRequest
    setBlockConfirmOpen(false)
    const blocked = await relation.block()
    if (blocked && fromRequest) onBack()
  }

  const handleDeclineMessage = async () => {
    if (conversationId && (await relation.declineMessageRequest(conversationId))) onBack()
  }

  const handleDeclineFriend = async () => {
    if ((await relation.declineRequest()) && !conversationId) onBack()
  }

  // Acciones del encabezado (las mismas reglas que la web): íconos y, lo raro o destructivo, en "más".
  // Sin panel de fijados en mobile; el perfil se abre tocando el nombre
  const header = dmHeaderActions({
    name,
    actions,
    hasConversation: !!conversationId,
    inCallHere: !!conversationId && callConversationId === conversationId,
    pinned: undefined,
    showProfile: false,
    friendRequestSending: relation.requestSent,
    maxIcons: DM_HEADER_COMPACT_ICONS,
  })
  const runAction: Record<DmHeaderActionId, (() => void) | undefined> = {
    call: conversationId && onCall ? () => onCall(conversationId, name) : undefined,
    pins: undefined,
    'add-friend': relation.addFriend,
    'accept-friend': relation.acceptRequest,
    'decline-friend': handleDeclineFriend,
    'cancel-friend-request': relation.cancelRequest,
    profile: () => onOpenProfile(userId),
    unblock: relation.unblock,
    'remove-friend': () => setRemoveConfirmOpen(true),
    block: () => setBlockConfirmOpen(true),
  }
  // Mientras se procesa un cambio de relación, sus acciones esperan (llamar no depende de eso)
  const isDisabled = (action: DmHeaderAction) => !!action.disabled || (relation.busy && action.id !== 'call')
  const available = (action: DmHeaderAction) => runAction[action.id] !== undefined

  const body = () => {
    if (withQuery.isLoading) {
      return (
        <View style={styles.status}>
          <Skeleton lines={4} label="Cargando el chat" />
        </View>
      )
    }
    if (!conversation && withQuery.isError) {
      return <ListStatus loading={false} label="este chat" onRetry={() => withQuery.refetch()} />
    }
    if (conversation && (history.isLoading || history.isError)) {
      return <ListStatus loading={history.isLoading} label="los mensajes" onRetry={() => history.refetch()} />
    }

    return (
      <>
        {friendRequest && (
          <FriendRequestCard
            request={friendRequest}
            busy={relation.busy}
            onAccept={relation.acceptRequest}
            onDecline={handleDeclineFriend}
          />
        )}
        <MessageList
          channelName={name}
          welcomeTitle={name}
          welcomeHint={`este es el comienzo de tu conversación con ${name}.`}
          messages={messages}
          currentUserId={currentUserId}
          describeUser={describeUser}
          hasOlder={history.hasOlder}
          loadingOlder={history.isFetchingOlder}
          onLoadOlder={() => {
            history.fetchOlder().catch(() => showToast('No se pudieron cargar los mensajes anteriores', 'error'))
          }}
          onPressAuthor={onOpenProfile}
          onLongPressMessage={onLongPressMessage}
          onToggleReaction={
            conversationId
              ? (messageId, emoji) => {
                  toggleReaction(conversationId, messageId, emoji).catch((err) => {
                    const msg = err instanceof Error ? err.message : 'No se pudo actualizar la reacción'
                    showToast(msg, 'error')
                  })
                }
              : undefined
          }
        />
        {actions.canRespondMessageRequest && conversationId ? (
          <MessageRequestCard
            name={name}
            preview={conversation?.lastMessage?.content}
            busy={relation.busy}
            onAccept={() => relation.acceptMessageRequest(conversationId)}
            onDecline={handleDeclineMessage}
            onBlock={() => setBlockConfirmOpen(true)}
            onAddFriend={actions.canAddFriend && !relation.requestSent ? relation.addFriend : undefined}
          />
        ) : (
          <Composer
            channelName={name}
            placeholder={`Enviar mensaje a ${name}`}
            value={draft}
            onChangeText={setDraft}
            onSend={handleSend}
            blockedMessage={actions.composerMessage}
            attachment={attachment}
            onAttach={conversationId ? pick : undefined}
            onRemoveAttachment={() => setAttachment(null)}
            isUploading={uploading}
          />
        )}
      </>
    )
  }

  return (
    <Pane backLabel="Amigos" onBack={onBack}>
      <ChatHeader
        channelName={name}
        direct
        status={presence?.[userId] === 'online' ? 'conectado/' : 'desconectado/'}
        onPressTitle={() => onOpenProfile(userId)}
        actions={
          <>
            {header.icons.filter(available).map(action => (
              <IconButton
                key={action.id}
                icon={ACTION_ICONS[action.icon]}
                label={action.label}
                onPress={runAction[action.id]}
                pressed={action.pressed}
                badge={action.badge}
                tone={action.destructive ? 'danger' : 'default'}
                disabled={isDisabled(action)}
              />
            ))}
            <MoreMenu
              items={header.menu.filter(available).map(action => ({
                key: action.id,
                label: action.label,
                icon: ACTION_ICONS[action.icon],
                destructive: action.destructive,
                disabled: isDisabled(action),
                onSelect: () => runAction[action.id]?.(),
              }))}
            />
          </>
        }
      />
      {body()}
      <ConfirmModal
        visible={blockConfirmOpen}
        title={`¿Bloquear a ${name}?`}
        message="No van a poder escribirse hasta que lo desbloquees. El historial se conserva."
        confirmLabel="Bloquear"
        tone="danger"
        onCancel={() => setBlockConfirmOpen(false)}
        onConfirm={handleBlock}
      />
      <ConfirmModal
        visible={removeConfirmOpen}
        title={`¿Eliminar a ${name} de tus amigos?`}
        message="La conversación y el historial se conservan."
        confirmLabel="Eliminar"
        tone="danger"
        onCancel={() => setRemoveConfirmOpen(false)}
        onConfirm={handleRemoveFriend}
      />
    </Pane>
  )
}

const useStyles = makeStyles(t => ({
  status: { flex: 1, paddingVertical: t.space[5], paddingHorizontal: t.space[4] },
}))
