import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AppState } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import type { User, Server, Category, Channel, Message, MessageAttachment, MessageBackendPayload, Reaction } from '../types'
import { useAuth } from './AuthProvider'
import { markDeletedInList, mergeIntoList, setThreadSummaryInList } from '../utils/channelMessages'
import {
  useMyStatusQuery,
  getMessages,
  MESSAGES_PAGE_SIZE,
  getServers,
  sendMessage as apiSendMessage,
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
  toggleReaction as apiToggleReaction,
  updateCachedMessages,
  normalizeMessage,
  syncPinnedMessage,
  mergeCachedMessage,
  markCachedMessageDeleted,
  applyThreadReply,
  type ThreadSummary,
  togglePinnedMessage,
  loadUntilMessage,
  type PinState,
  createServer as apiCreateServer,
  updateServerIcon as apiUpdateServerIcon,
  removeServerIcon as apiRemoveServerIcon,
  updateServerBanner as apiUpdateServerBanner,
  removeServerBanner as apiRemoveServerBanner,
  createChannel as apiCreateChannel,
  editChannel as apiEditChannel,
  deleteChannel as apiDeleteChannel,
  leaveServer as apiLeaveServer,
  deleteServer as apiDeleteServer,
  createCategory as apiCreateCategory,
  reorderChannels as apiReorderChannels,
  reorderCategories as apiReorderCategories,
  type UploadableFile,
} from '@discordia/core'

interface DataContextValue {
  currentUserId: string
  /** Usuarios conocidos (por ahora, el propio); el resto se pide con useUserDisplay. */
  users: Record<string, User>
  servers: Server[]
  /** Ya respondió el backend (o falló): distingue "cargando" de "no tenés servidores". */
  serversLoaded: boolean
  messages: Record<string, Message[]>
  /** Por canal: hay mensajes anteriores a los cargados (Chat-Engine devolvió una página llena). */
  hasOlderMessages: Record<string, boolean>
  /** Por canal: se están pidiendo los mensajes anteriores. */
  loadingOlderMessages: Record<string, boolean>

  // Servidores y canales en vivo
  refreshServers: () => Promise<void>
  /** `icon`: el archivo de toUploadFile (utils/images). */
  createServer: (name: string, icon?: UploadableFile) => Promise<Server>
  /** Cambia el ícono (o lo quita con null) y aplica la URL que devuelve la API. Rechaza con el ApiError. */
  setServerIcon: (serverId: string, icon: UploadableFile | null) => Promise<void>
  /** Cambia el banner (null lo quita) y actualiza la lista de servidores con el que devuelve la API. */
  setServerBanner: (serverId: string, banner: UploadableFile | null) => Promise<void>
  createChannel: (
    serverId: string,
    data: { name: string; type: 'text' | 'voice'; categoryId?: string },
  ) => Promise<Channel>
  editChannel: (
    serverId: string,
    channelId: string,
    data: { name?: string; topic?: string; categoryId?: string | null },
  ) => Promise<Channel>
  deleteChannel: (serverId: string, channelId: string) => Promise<void>
  createCategory: (serverId: string, name: string) => Promise<void>
  /** Guarda el orden de canales/categorías que se pasa (ya reordenado con channelLayout de @discordia/core). */
  reorderChannels: (serverId: string, categories: Category[]) => Promise<void>
  reorderCategories: (serverId: string, categories: Category[]) => Promise<void>
  leaveServer: (serverId: string) => Promise<void>
  /** Elimina el servidor (solo quien lo creó). */
  deleteServer: (serverId: string) => Promise<void>
  /** Saca del estado local un servidor eliminado externamente (p. ej. desde el backoffice). */
  removeServerLocally: (serverId: string) => void

  // Mutaciones y sincronización
  sendMessage: (channelId: string, content: string, attachments?: MessageAttachment[], replyTo?: Message | null) => void
  editMessage: (channelId: string, messageId: string, content: string) => Promise<Message>
  deleteMessage: (channelId: string, messageId: string) => Promise<void>
  toggleReaction: (channelId: string, messageId: string, emoji: string) => Promise<Message>
  /** Fija o desfija (togglePinnedMessage de core). Si falla, vuelve atrás y rechaza con un texto para mostrar. */
  togglePin: (channelId: string, message: Message) => Promise<void>
  addOptimisticMessage: (channelId: string, content: string, attachments?: MessageAttachment[], replyTo?: Message | null) => string
  confirmOptimisticMessage: (channelId: string, payload: MessageBackendPayload) => void
  /** MESSAGE_UPDATED del socket del canal: actualiza un mensaje que ya está; nunca agrega uno. */
  applyRemoteUpdate: (channelId: string, payload: MessageBackendPayload) => void
  /** Otro borró un mensaje (MESSAGE_DELETED por el socket del canal, deuda C6). */
  applyRemoteDelete: (channelId: string, payload: MessageBackendPayload) => void
  /** Alguien respondió en un hilo del canal (THREAD_REPLY_CREATED): el resumen del original y el hilo. */
  applyThreadReplyEvent: (channelId: string, parentId: string, reply: MessageBackendPayload, thread: ThreadSummary) => void
  failOptimisticMessage: (channelId: string) => void
  fetchChannelMessages: (channelId: string) => Promise<void>
  /** Pide la página anterior del historial y la agrega arriba. Rechaza si falla la red. */
  fetchOlderChannelMessages: (channelId: string) => Promise<void>
  /** Carga páginas anteriores hasta tener el mensaje (ir a un fijado). false si no apareció; rechaza si falla la red. */
  loadChannelMessagesUntil: (channelId: string, messageId: string) => Promise<boolean>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { token, userProfile } = useAuth()

  const activeUserId = userProfile?.id ?? ''

  const [users, setUsers] = useState<Record<string, User>>({})
  const [servers, setServers] = useState<Server[]>([])
  const [serversLoaded, setServersLoaded] = useState(false)
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [hasOlderMessages, setHasOlderMessages] = useState<Record<string, boolean>>({})
  const [loadingOlderMessages, setLoadingOlderMessages] = useState<Record<string, boolean>>({})
  // Lo que ya está cargado, para elegir el cursor sin depender del render
  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])
  const loadingOlderRef = useRef(new Set<string>())

  // Estado elegido por el usuario (lo guarda Chat-Engine). El activity_status del perfil no se usa
  const { data: myStatus } = useMyStatusQuery()

  // Sincronizar el perfil del usuario autenticado en el diccionario de usuarios
  useEffect(() => {
    if (!userProfile) return
    const profileUser: User = {
      id: userProfile.id,
      username: userProfile.username,
      displayName: userProfile.display_name || userProfile.username,
      avatar: userProfile.avatar_url || undefined,
      status: myStatus ?? 'online',
      customStatus: userProfile.custom_status,
      bio: userProfile.bio,
    }
    setUsers(prev => ({
      ...prev,
      [userProfile.id]: profileUser,
      ...(userProfile.user_id ? { [userProfile.user_id]: profileUser } : {}),
    }))
  }, [userProfile, myStatus])

  // Carga y sincronización de servidores desde el backend
  const refreshServers = useCallback(async () => {
    if (!token) return
    try {
      const serverList = await getServers()
      if (Array.isArray(serverList)) setServers(serverList)
    } catch {
      // Si falla la red o el endpoint no responde, conserva los que ya había
    } finally {
      setServersLoaded(true)
    }
  }, [token])

  useEffect(() => {
    refreshServers()
  }, [refreshServers])

  // Al volver a la app se piden de nuevo: los permisos (my_permissions) o los canales pueden haber
  // cambiado mientras estaba en segundo plano
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshServers()
    })
    return () => subscription.remove()
  }, [refreshServers])

  const createServer = useCallback(async (name: string, icon?: UploadableFile): Promise<Server> => {
    const newServer = await apiCreateServer(icon ? { name, icon } : { name })
    setServers(prev => [...prev, newServer])
    return newServer
  }, [])

  const createChannel = useCallback(
    async (
      serverId: string,
      data: { name: string; type: 'text' | 'voice'; categoryId?: string },
    ): Promise<Channel> => {
      const newChannel = await apiCreateChannel(serverId, {
        name: data.name,
        type: data.type,
        parentId: data.categoryId,
      })
      setServers(prev =>
        prev.map(srv => {
          if (srv.id !== serverId) return srv
          const updatedChannels = [...(srv.channels || []), newChannel]
          const updatedCategories = srv.categories.map((cat, idx) => {
            const isTarget = data.categoryId ? cat.id === data.categoryId : idx === 0
            if (!isTarget && srv.categories.length > 1) return cat
            return {
              ...cat,
              channels: [...cat.channels, newChannel],
            }
          })
          return {
            ...srv,
            channels: updatedChannels,
            categories: updatedCategories,
          }
        }),
      )
      return newChannel
    },
    [],
  )

  const editChannel = useCallback(
    async (
      serverId: string,
      channelId: string,
      data: { name?: string; topic?: string; categoryId?: string | null },
    ): Promise<Channel> => {
      const updatedChannel = await apiEditChannel(serverId, channelId, {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.topic !== undefined && { topic: data.topic.trim() }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      })
      // Si cambió de categoría hay que reagrupar: se recarga del backend, que es la fuente de verdad
      if (data.categoryId !== undefined) {
        await refreshServers()
        return updatedChannel
      }
      setServers(prev =>
        prev.map(srv => {
          if (srv.id !== serverId) return srv
          const updatedChannels = (srv.channels || []).map(ch =>
            ch.id === channelId ? { ...ch, ...updatedChannel } : ch,
          )
          const updatedCategories = srv.categories.map(cat => ({
            ...cat,
            channels: cat.channels.map(ch =>
              ch.id === channelId ? { ...ch, ...updatedChannel } : ch,
            ),
          }))
          return {
            ...srv,
            channels: updatedChannels,
            categories: updatedCategories,
          }
        }),
      )
      return updatedChannel
    },
    [refreshServers],
  )

  const createCategory = useCallback(
    async (serverId: string, name: string): Promise<void> => {
      await apiCreateCategory(serverId, { name: name.trim() })
      await refreshServers()
    },
    [refreshServers],
  )

  // Reorden optimista: se muestra al instante y, si el backend lo rechaza, se vuelve a lo que tiene guardado
  const applyReorder = useCallback(
    async (
      serverId: string,
      categories: Category[],
      save: (serverId: string, categories: Category[]) => Promise<void>,
    ): Promise<void> => {
      setServers(prev =>
        prev.map(srv =>
          srv.id === serverId
            ? { ...srv, categories, channels: categories.flatMap(c => c.channels) }
            : srv,
        ),
      )
      try {
        await save(serverId, categories)
      } catch (err) {
        await refreshServers()
        throw err
      }
    },
    [refreshServers],
  )

  const reorderChannels = useCallback(
    (serverId: string, categories: Category[]) => applyReorder(serverId, categories, apiReorderChannels),
    [applyReorder],
  )

  const reorderCategories = useCallback(
    (serverId: string, categories: Category[]) => applyReorder(serverId, categories, apiReorderCategories),
    [applyReorder],
  )

  const deleteChannel = useCallback(
    async (serverId: string, channelId: string): Promise<void> => {
      await apiDeleteChannel(serverId, channelId)
      setServers(prev =>
        prev.map(srv => {
          if (srv.id !== serverId) return srv
          const updatedChannels = (srv.channels || []).filter(ch => ch.id !== channelId)
          const updatedCategories = srv.categories.map(cat => ({
            ...cat,
            channels: cat.channels.filter(ch => ch.id !== channelId),
          }))
          return {
            ...srv,
            channels: updatedChannels,
            categories: updatedCategories,
          }
        }),
      )
      // Limpiar mensajes locales del canal eliminado
      setMessages(prev => {
        const copy = { ...prev }
        delete copy[channelId]
        return copy
      })
    },
    [],
  )


  const leaveServer = useCallback(
    async (serverId: string): Promise<void> => {
      await apiLeaveServer(serverId)
      setServers(prev => prev.filter(srv => srv.id !== serverId))
    },
    [],
  )

  const deleteServer = useCallback(
    async (serverId: string): Promise<void> => {
      await apiDeleteServer(serverId)
      setServers(prev => prev.filter(srv => srv.id !== serverId))
    },
    [],
  )

  const removeServerLocally = useCallback((serverId: string) => {
    setServers(prev => prev.filter(srv => srv.id !== serverId))
  }, [])

  // Mensajes de un canal (Chat-Engine-Service). Si falla, quedan los que ya había
  const fetchChannelMessages = useCallback(
    async (channelId: string) => {
      if (!token) return
      try {
        const list = await getMessages(channelId)
        setMessages(prev => ({ ...prev, [channelId]: list.map(m => ({ ...m, status: 'sent' as const })) }))
        setHasOlderMessages(prev => ({ ...prev, [channelId]: list.length >= MESSAGES_PAGE_SIZE }))
      } catch {
        // sin red: se conservan los mensajes en memoria
      }
    },
    [token],
  )

  // Página anterior: los mensajes antes del más viejo que ya está (sin contar los que todavía no se enviaron)
  const fetchOlderChannelMessages = useCallback(
    async (channelId: string) => {
      const oldest = (messagesRef.current[channelId] ?? []).find(m => !m.id.startsWith('temp-'))
      if (!token || !oldest || loadingOlderRef.current.has(channelId)) return
      loadingOlderRef.current.add(channelId)
      setLoadingOlderMessages(prev => ({ ...prev, [channelId]: true }))
      try {
        const list = await getMessages(channelId, { before: oldest.id })
        setMessages(prev => {
          const current = prev[channelId] ?? []
          const known = new Set(current.map(m => m.id))
          const older = list.filter(m => !known.has(m.id)).map(m => ({ ...m, status: 'sent' as const }))
          return { ...prev, [channelId]: [...older, ...current] }
        })
        setHasOlderMessages(prev => ({ ...prev, [channelId]: list.length >= MESSAGES_PAGE_SIZE }))
      } finally {
        loadingOlderRef.current.delete(channelId)
        setLoadingOlderMessages(prev => ({ ...prev, [channelId]: false }))
      }
    },
    [token],
  )

  // Ir a un fijado: el loop es el de core (loadUntilMessage). Las páginas se juntan acá y se agregan de una vez,
  // porque messagesRef recién se actualiza en el render siguiente
  const loadChannelMessagesUntil = useCallback(
    async (channelId: string, messageId: string) => {
      const loaded = messagesRef.current[channelId] ?? []
      let cursor = loaded.find(m => !m.id.startsWith('temp-'))?.id
      const fetched: Message[] = []
      let hasMore = true
      const found = await loadUntilMessage({
        isLoaded: () => loaded.some(m => m.id === messageId) || fetched.some(m => m.id === messageId),
        loadOlder: async () => {
          if (!cursor) return (hasMore = false)
          const page = await getMessages(channelId, { before: cursor })
          fetched.unshift(...page.map(m => ({ ...m, status: 'sent' as const })))
          cursor = page[0]?.id
          hasMore = page.length >= MESSAGES_PAGE_SIZE
          return hasMore
        },
      })
      if (fetched.length > 0) {
        setMessages(prev => {
          const current = prev[channelId] ?? []
          const known = new Set(current.map(m => m.id))
          return { ...prev, [channelId]: [...fetched.filter(m => !known.has(m.id)), ...current] }
        })
        setHasOlderMessages(prev => ({ ...prev, [channelId]: hasMore }))
      }
      return found
    },
    [],
  )

  const addOptimisticMessage = useCallback(
    (channelId: string, content: string, attachments?: MessageAttachment[], replyTo?: Message | null): string => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const now = new Date().toISOString()
      const newMessage: Message = {
        id: tempId,
        channelId,
        authorId: activeUserId,
        content,
        timestamp: now,
        createdAt: now,
        type: 'normal',
        status: 'pending',
        attachments,
        // La cita se ve ya; al confirmarse la reemplaza la copia que guardó Chat-Engine
        ...(replyTo ? { replyToId: replyTo.id, replyTo } : {}),
      }
      setMessages(prev => ({
        ...prev,
        [channelId]: [...(prev[channelId] ?? []), newMessage],
      }))
      return tempId
    },
    [activeUserId],
  )

  /**
   * Un MESSAGE_UPDATED (edición, reacción, fijado, contador de un hilo). Solo toca un mensaje que ya está en la
   * lista del canal: uno que no está (una respuesta de hilo, o una página no cargada) no se agrega. Fijados e
   * hilos (React Query) se ponen al día acá.
   */
  const applyRemoteUpdate = useCallback(
    (channelId: string, payload: MessageBackendPayload) => {
      const normalized = normalizeMessage(payload as unknown as Message)
      mergeCachedMessage(queryClient, channelId, normalized)
      setMessages(prev => {
        const list = prev[channelId]
        const updated = list && mergeIntoList(list, payload, normalized)
        return updated ? { ...prev, [channelId]: updated } : prev
      })
    },
    [queryClient],
  )

  /** Un mensaje nuevo del canal (MESSAGE_CREATED o la respuesta del POST): confirma el pendiente o lo agrega. */
  const confirmOptimisticMessage = useCallback(
    (channelId: string, payload: MessageBackendPayload) => {
      const normalized = normalizeMessage(payload as unknown as Message)
      mergeCachedMessage(queryClient, channelId, normalized)
      // Las respuestas de hilo no van en el canal (llegan como THREAD_REPLY_CREATED)
      if (normalized.threadParentId) return
      setMessages(prev => {
        const list = prev[channelId] ?? []
        // Si ya existe este ID exacto (por ejemplo reconexión/duplicado), asegurarse de que esté como sent
        const merged = mergeIntoList(list, payload, normalized)
        if (merged) return { ...prev, [channelId]: merged }

        // Si es un mensaje emitido por el usuario activo, buscar el mensaje pendiente correspondiente
        if (payload.authorId === activeUserId) {
          let pendingIndex = list.findIndex(
            m => m.status === 'pending' && m.content === payload.content,
          )
          if (pendingIndex === -1) {
            pendingIndex = list.findIndex(m => m.status === 'pending')
          }

          if (pendingIndex !== -1) {
            const updated = [...list]
            updated[pendingIndex] = {
              ...updated[pendingIndex],
              localId: updated[pendingIndex].localId ?? updated[pendingIndex].id,
              id: payload.id,
              authorId: payload.authorId,
              content: payload.content,
              createdAt: payload.createdAt,
              timestamp: payload.createdAt,
              status: 'sent',
              reactions: payload.reactions ?? updated[pendingIndex].reactions ?? [],
              replyTo: normalized.replyTo ?? updated[pendingIndex].replyTo,
            }
            return { ...prev, [channelId]: updated }
          }
        }

        // Si es de otro usuario o no se encontró pendiente, agregarlo a la lista
        const newMsg: Message = {
          id: payload.id,
          channelId: payload.channelId || channelId,
          authorId: payload.authorId,
          content: payload.content,
          createdAt: payload.createdAt,
          timestamp: payload.createdAt,
          type: 'normal',
          status: 'sent',
          reactions: payload.reactions ?? [],
          mentions: normalized.mentions,
          attachments: normalized.attachments,
          replyToId: normalized.replyTo?.id ?? null,
          replyTo: normalized.replyTo ?? null,
        }
        return { ...prev, [channelId]: [...list, newMsg] }
      })
    },
    [activeUserId, queryClient],
  )

  const applyRemoteDelete = useCallback(
    (channelId: string, payload: MessageBackendPayload) => {
      const normalized = normalizeMessage(payload as unknown as Message)
      // Fijados, DMs e hilos (React Query): sale de los fijados y, si era una respuesta, queda borrada en su hilo
      markCachedMessageDeleted(queryClient, channelId, normalized)
      setMessages(prev => {
        const list = prev[channelId]
        if (!list) return prev
        return { ...prev, [channelId]: markDeletedInList(list, normalized) }
      })
    },
    [queryClient],
  )

  const applyThreadReplyEvent = useCallback(
    (channelId: string, parentId: string, reply: MessageBackendPayload, thread: ThreadSummary) => {
      applyThreadReply(queryClient, channelId, parentId, normalizeMessage(reply as unknown as Message), thread)
      setMessages(prev => {
        const list = prev[channelId]
        if (!list) return prev
        return { ...prev, [channelId]: setThreadSummaryInList(list, parentId, thread) }
      })
    },
    [queryClient],
  )

  const failOptimisticMessage = useCallback((channelId: string) => {
    setMessages(prev => {
      const list = prev[channelId] ?? []
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].status === 'pending') {
          const updated = [...list]
          updated[i] = { ...updated[i], status: 'failed' }
          return { ...prev, [channelId]: updated }
        }
      }
      return prev
    })
  }, [])

  // Envío por REST (el normal es por el WebSocket del canal): se muestra al instante y queda enviado o fallido
  const sendMessage = useCallback(
    (channelId: string, content: string, attachments?: MessageAttachment[], replyTo?: Message | null) => {
      const tempId = addOptimisticMessage(channelId, content, attachments, replyTo)
      apiSendMessage(channelId, content, tempId, attachments, replyTo?.id)
        .then(sent => confirmOptimisticMessage(channelId, { ...sent, createdAt: sent.createdAt ?? sent.timestamp }))
        .catch(() => failOptimisticMessage(channelId))
    },
    [addOptimisticMessage, confirmOptimisticMessage, failOptimisticMessage],
  )

  const editMessage = useCallback(
    async (channelId: string, messageId: string, newContent: string): Promise<Message> => {
      let previousContent = ''
      let previousEdited = false
      let previousEditedTimestamp: string | null | undefined = null

      const updateRq = (update: (list: Message[]) => Message[]) => {
        updateCachedMessages(queryClient, channelId, update)
      }

      setMessages(prev => {
        const list = prev[channelId] ?? []
        return {
          ...prev,
          [channelId]: list.map(m => {
            if (m.id === messageId) {
              previousContent = m.content
              previousEdited = m.edited ?? false
              previousEditedTimestamp = m.editedTimestamp
              return {
                ...m,
                content: newContent,
                edited: true,
                editedTimestamp: new Date().toISOString(),
              }
            }
            return m
          }),
        }
      })
      updateRq(list =>
        list.map(m =>
          m.id === messageId
            ? {
                ...m,
                content: newContent,
                edited: true,
                editedTimestamp: new Date().toISOString(),
              }
            : m
        )
      )

      try {
        const updated = await apiEditMessage(channelId, messageId, newContent)
        setMessages(prev => {
          const list = prev[channelId] ?? []
          return {
            ...prev,
            [channelId]: list.map(m => (m.id === messageId ? updated : m)),
          }
        })
        updateRq(list => list.map(m => (m.id === messageId ? updated : m)))
        return updated
      } catch (err) {
        setMessages(prev => {
          const list = prev[channelId] ?? []
          return {
            ...prev,
            [channelId]: list.map(m =>
              m.id === messageId
                ? { ...m, content: previousContent, edited: previousEdited, editedTimestamp: previousEditedTimestamp }
                : m
            ),
          }
        })
        updateRq(list =>
          list.map(m =>
            m.id === messageId
              ? { ...m, content: previousContent, edited: previousEdited, editedTimestamp: previousEditedTimestamp }
              : m
          )
        )
        throw err
      }
    },
    [queryClient]
  )

  const deleteMessage = useCallback(
    async (channelId: string, messageId: string): Promise<void> => {
      let previousMessage: Message | undefined

      const updateRq = (update: (list: Message[]) => Message[]) => {
        updateCachedMessages(queryClient, channelId, update)
      }

      setMessages(prev => {
        const list = prev[channelId] ?? []
        previousMessage = list.find(m => m.id === messageId)
        return {
          ...prev,
          [channelId]: list.map(m =>
            m.id === messageId
              ? { ...m, type: 'deleted' as const, content: '', attachments: [] }
              : m
          ),
        }
      })
      updateRq(list =>
        list.map(m =>
          m.id === messageId
            ? { ...m, type: 'deleted' as const, content: '', attachments: [] }
            : m
        )
      )

      try {
        const deleted = await apiDeleteMessage(channelId, messageId)
        // Borrado deja de estar fijado (por si el MESSAGE_DELETED del socket no llega)
        syncPinnedMessage(queryClient, channelId, deleted)
      } catch (err) {
        if (previousMessage) {
          const prevMsg = previousMessage
          setMessages(prev => {
            const list = prev[channelId] ?? []
            return {
              ...prev,
              [channelId]: list.map(m => (m.id === messageId ? prevMsg : m)),
            }
          })
          updateRq(list => list.map(m => (m.id === messageId ? prevMsg : m)))
        }
        throw err
      }
    },
    [queryClient]
  )

  // Fijar: la lógica optimista es de core (historial y fijados en React Query, que usan los DMs); acá solo se
  // replica en el estado local de los canales
  const togglePin = useCallback(
    (channelId: string, message: Message) =>
      togglePinnedMessage(queryClient, channelId, message, {
        onPinStateChange: (messageId: string, state: PinState) =>
          setMessages(prev => {
            const list = prev[channelId]
            if (!list) return prev
            return { ...prev, [channelId]: list.map(m => (m.id === messageId ? { ...m, ...state } : m)) }
          }),
      }),
    [queryClient],
  )

  const toggleReaction = useCallback(
    async (channelId: string, messageId: string, emoji: string): Promise<Message> => {
      let previousReactions: Reaction[] | undefined

      const updateRq = (update: (list: Message[]) => Message[]) => {
        updateCachedMessages(queryClient, channelId, update)
      }

      setMessages(prev => {
        const list = prev[channelId] ?? []
        const msg = list.find(m => m.id === messageId)
        if (msg) {
          previousReactions = msg.reactions ? [...msg.reactions] : []
        }
        return {
          ...prev,
          [channelId]: list.map(m => {
            if (m.id !== messageId) return m
            const reactions = m.reactions || []
            const existing = reactions.find(r => r.emoji === emoji)
            const hasReacted = existing
              ? (existing.hasReacted ?? existing.reacted ?? existing.users.includes(activeUserId))
              : false

            let nextReactions: Reaction[]
            if (existing && hasReacted) {
              nextReactions = reactions
                .map(r =>
                  r.emoji === emoji
                    ? {
                        ...r,
                        count: r.count - 1,
                        reacted: false,
                        hasReacted: false,
                        users: (r.users || []).filter(u => u !== activeUserId),
                      }
                    : r
                )
                .filter(r => r.count > 0)
            } else if (existing) {
              nextReactions = reactions.map(r =>
                r.emoji === emoji
                  ? {
                      ...r,
                      count: r.count + 1,
                      reacted: true,
                      hasReacted: true,
                      users: [...(r.users || []), activeUserId],
                    }
                  : r
              )
            } else {
              nextReactions = [
                ...reactions,
                { emoji, count: 1, reacted: true, hasReacted: true, users: [activeUserId] },
              ]
            }
            return { ...m, reactions: nextReactions }
          }),
        }
      })

      updateRq(list =>
        list.map(m => {
          if (m.id !== messageId) return m
          const reactions = m.reactions || []
          const existing = reactions.find(r => r.emoji === emoji)
          const hasReacted = existing
            ? (existing.hasReacted ?? existing.reacted ?? existing.users.includes(activeUserId))
            : false

          let nextReactions: Reaction[]
          if (existing && hasReacted) {
            nextReactions = reactions
              .map(r =>
                r.emoji === emoji
                  ? {
                      ...r,
                      count: r.count - 1,
                      reacted: false,
                      hasReacted: false,
                      users: (r.users || []).filter(u => u !== activeUserId),
                    }
                  : r
              )
              .filter(r => r.count > 0)
          } else if (existing) {
            nextReactions = reactions.map(r =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count + 1,
                    reacted: true,
                    hasReacted: true,
                    users: [...(r.users || []), activeUserId],
                  }
                : r
            )
          } else {
            nextReactions = [
              ...reactions,
              { emoji, count: 1, reacted: true, hasReacted: true, users: [activeUserId] },
            ]
          }
          return { ...m, reactions: nextReactions }
        })
      )

      try {
        const updated = await apiToggleReaction(channelId, messageId, emoji)
        setMessages(prev => {
          const list = prev[channelId] ?? []
          return {
            ...prev,
            [channelId]: list.map(m => (m.id === messageId ? { ...m, reactions: updated.reactions } : m)),
          }
        })
        updateRq(list => list.map(m => (m.id === messageId ? { ...m, reactions: updated.reactions } : m)))
        return updated
      } catch (err) {
        if (previousReactions !== undefined) {
          const prevReactions = previousReactions
          setMessages(prev => {
            const list = prev[channelId] ?? []
            return {
              ...prev,
              [channelId]: list.map(m => (m.id === messageId ? { ...m, reactions: prevReactions } : m)),
            }
          })
          updateRq(list => list.map(m => (m.id === messageId ? { ...m, reactions: prevReactions } : m)))
        }
        throw err
      }
    },
    [activeUserId, queryClient]
  )

  const setServerIcon = useCallback(async (serverId: string, icon: UploadableFile | null): Promise<void> => {
    const updated = icon ? await apiUpdateServerIcon(serverId, icon) : await apiRemoveServerIcon(serverId)
    // Solo el ícono: el resto del servidor (canales, categorías) ya está al día en la lista
    setServers(prev => prev.map(srv => (srv.id === serverId ? { ...srv, iconUrl: updated.iconUrl } : srv)))
  }, [])

  const setServerBanner = useCallback(async (serverId: string, banner: UploadableFile | null): Promise<void> => {
    const updated = banner ? await apiUpdateServerBanner(serverId, banner) : await apiRemoveServerBanner(serverId)
    // Solo el banner, como el ícono
    setServers(prev => prev.map(srv => (srv.id === serverId ? { ...srv, banner: updated.banner } : srv)))
  }, [])

  const value = useMemo<DataContextValue>(
    () => ({
      currentUserId: activeUserId,
      users,
      servers,
      serversLoaded,
      messages,
      hasOlderMessages,
      loadingOlderMessages,
      refreshServers,
      createServer,
      setServerIcon,
      setServerBanner,
      createChannel,
      editChannel,
      deleteChannel,
      createCategory,
      reorderChannels,
      reorderCategories,
      leaveServer,
      deleteServer,
      removeServerLocally,
      sendMessage,
      editMessage,
      deleteMessage,
      toggleReaction,
      togglePin,
      addOptimisticMessage,
      confirmOptimisticMessage,
      applyRemoteUpdate,
      applyRemoteDelete,
      applyThreadReplyEvent,
      failOptimisticMessage,
      fetchChannelMessages,
      fetchOlderChannelMessages,
      loadChannelMessagesUntil,
    }),
    [
      activeUserId,
      users,
      servers,
      serversLoaded,
      messages,
      hasOlderMessages,
      loadingOlderMessages,
      refreshServers,
      createServer,
      setServerIcon,
      setServerBanner,
      createChannel,
      editChannel,
      deleteChannel,
      createCategory,
      reorderChannels,
      reorderCategories,
      leaveServer,
      deleteServer,
      removeServerLocally,
      sendMessage,
      editMessage,
      deleteMessage,
      toggleReaction,
      togglePin,
      addOptimisticMessage,
      confirmOptimisticMessage,
      applyRemoteUpdate,
      applyRemoteDelete,
      applyThreadReplyEvent,
      failOptimisticMessage,
      fetchChannelMessages,
      fetchOlderChannelMessages,
      loadChannelMessagesUntil,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>')
  return ctx
}
