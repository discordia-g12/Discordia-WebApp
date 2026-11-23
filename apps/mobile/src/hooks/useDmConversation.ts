import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  appendMessage,
  applyConversationMessage,
  conversationsQueryKey,
  conversationWithQueryKey,
  dmActions,
  dmSendErrorMessage,
  messagesQueryKey,
  sendMessage,
  useAcceptConversationMutation,
  useChannelMessagesQuery,
  useConversationsQuery,
  useConversationWithQuery,
  usePublicProfileQuery,
  useStartConversationMutation,
  type Conversation,
  type MessageAttachment,
  type MessagePages,
} from '@discordia/core'
import { useData, useUI } from '../providers/AppProviders'
import type { Message } from '../types'

/**
 * Lo que hace falta para mostrar el chat con un usuario: su perfil, la conversación (null hasta el primer
 * mensaje) y qué se puede hacer. La lista manda sobre `with`, porque el socket inbox la mantiene al día; `with`
 * cubre la conversación que no está en la lista (rechazada, o abierta con un id que es un alias).
 */
export function useDmConversation(userId: string) {
  const profileQuery = usePublicProfileQuery(userId)
  const withQuery = useConversationWithQuery(userId)
  const { data: conversations } = useConversationsQuery()

  const fromWith = withQuery.data?.conversation ?? null
  const conversation = conversations?.find(c => c.id === fromWith?.id || c.otherUserId === userId) ?? fromWith
  const relationship = profileQuery.data?.relationship ?? 'none'
  const actions = dmActions({ relationship, conversation, canMessage: withQuery.data?.canMessage })

  return { profileQuery, withQuery, conversation, actions }
}

/**
 * Historial y envío de un chat directo. Se envía por REST: el socket inbox trae lo que llega y el rechazo vuelve
 * con su código (`DM_PENDING`, `DM_NOT_DELIVERABLE`). Sin conversación, el primer mensaje la crea. Si quien rechazó
 * escribe, primero se acepta: escribir es arrepentirse.
 */
export function useDmMessages(userId: string, conversation: Conversation | null) {
  const queryClient = useQueryClient()
  const { currentUserId } = useData()
  const { showToast } = useUI()
  const start = useStartConversationMutation()
  const accept = useAcceptConversationMutation()
  const history = useChannelMessagesQuery(conversation?.id ?? null)
  const [pending, setPending] = useState<Message[]>([])
  // id real -> id temporal: al confirmarse, la fila no se vuelve a montar
  const [localIds, setLocalIds] = useState<Record<string, string>>({})

  const deliver = async (content: string, tempId: string, attachments?: MessageAttachment[], replyToId?: string) => {
    if (!conversation) {
      const created = await start.mutateAsync({ recipientId: userId, content })
      queryClient.setQueryData<MessagePages>(messagesQueryKey(created.conversation.id), {
        pages: [[created.message]],
        pageParams: [undefined],
      })
      return created.message
    }
    if (conversation.status === 'declined') await accept.mutateAsync(conversation.id)

    const sent = await sendMessage(conversation.id, content, tempId, attachments, replyToId)
    queryClient.setQueryData<MessagePages>(messagesQueryKey(conversation.id), old => appendMessage(old, sent))
    queryClient.setQueryData<Conversation[]>(conversationsQueryKey, old =>
      applyConversationMessage(old, conversation.id, sent, conversation.id),
    )
    return sent
  }

  const send = async (content: string, attachments?: MessageAttachment[], replyTo?: Message | null) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const now = new Date().toISOString()
    const optimistic: Message = {
      id: tempId,
      channelId: conversation?.id ?? '',
      authorId: currentUserId,
      content,
      timestamp: now,
      createdAt: now,
      type: 'normal',
      status: 'pending',
      attachments,
      ...(replyTo ? { replyToId: replyTo.id, replyTo } : {}),
    }
    setPending(prev => [...prev, optimistic])

    try {
      const sent = await deliver(content, tempId, attachments, replyTo?.id)
      setLocalIds(prev => ({ ...prev, [sent.id]: tempId }))
      setPending(prev => prev.filter(m => m.id !== tempId))
    } catch (err) {
      setPending(prev => prev.map(m => (m.id === tempId ? { ...m, status: 'failed' as const } : m)))
      showToast(dmSendErrorMessage(err), 'error')
      // Pudo cambiar la relación: el composer tiene que mostrar el estado nuevo
      queryClient.invalidateQueries({ queryKey: conversationWithQueryKey(userId) })
    }
  }

  const messages = useMemo<Message[]>(
    () => [
      ...(history.data ?? []).map(m => (localIds[m.id] ? { ...m, localId: localIds[m.id] } : m)),
      ...pending,
    ],
    [history.data, localIds, pending],
  )

  const { refetch } = history
  const refresh = useCallback(() => {
    refetch()
  }, [refetch])

  return { messages, history, send, refresh }
}
