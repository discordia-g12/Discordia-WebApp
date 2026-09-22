import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  USERS,
  SERVERS,
  MESSAGES,
  DIRECT_MESSAGES,
  DM_MESSAGES,
  NOTIFICATIONS,
  AUDIT_LOG,
  CURRENT_USER_ID,
} from '../data/mock'
import type {
  User,
  Server,
  Channel,
  ServerBackendResponse,
  Message,
  MessageBackendPayload,
  DirectMessage,
  Notification,
  AuditEntry,
} from '../types'
import { useAuth } from './AuthProvider'
import { apiFetch } from '../api/client'
import {
  getServers,
  createServer as apiCreateServer,
  createChannel as apiCreateChannel,
} from '../api/servers'

interface DataContextValue {
  currentUserId: string
  users: Record<string, User>
  servers: Server[]
  messages: Record<string, Message[]>
  directMessages: DirectMessage[]
  dmMessages: Record<string, Message[]>
  notifications: Notification[]
  auditLog: AuditEntry[]

  // Servidores y canales en vivo
  refreshServers: () => Promise<void>
  createServer: (name: string, icon?: any) => Promise<Server>
  createChannel: (
    serverId: string,
    data: { name: string; type: 'text' | 'voice'; categoryId?: string },
  ) => Promise<Channel>

  // Mutaciones y sincronización
  sendMessage: (channelId: string, content: string) => void
  addOptimisticMessage: (channelId: string, content: string) => string
  confirmOptimisticMessage: (channelId: string, payload: MessageBackendPayload) => void
  failOptimisticMessage: (channelId: string) => void
  editMessage: (channelId: string, messageId: string, content: string) => void
  deleteMessage: (channelId: string, messageId: string) => void
  toggleReaction: (channelId: string, messageId: string, emoji: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  fetchChannelMessages: (channelId: string) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { token, userProfile } = useAuth()

  // Determinar ID de usuario actual según autenticación real o fallback
  const activeUserId = userProfile?.id || CURRENT_USER_ID

  const [users, setUsers] = useState<Record<string, User>>(USERS)
  const [servers, setServers] = useState<Server[]>(SERVERS)
  const [messages, setMessages] = useState<Record<string, Message[]>>(MESSAGES)
  const [directMessages] = useState<DirectMessage[]>(DIRECT_MESSAGES)
  const [dmMessages, setDmMessages] = useState<Record<string, Message[]>>(DM_MESSAGES)
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS)
  const [auditLog] = useState<AuditEntry[]>(AUDIT_LOG)

  // Sincronizar el perfil del usuario autenticado en el diccionario de usuarios
  useEffect(() => {
    if (!userProfile) return
    const profileUser: User = {
      id: userProfile.id,
      name: userProfile.display_name || userProfile.username,
      username: userProfile.username,
      avatar: userProfile.avatar_url || null,
      color: '#7c5cfc',
      status: (userProfile.activity_status as any) || 'online',
      customStatus: userProfile.custom_status,
      bio: userProfile.bio,
      joinedAt: new Date().toISOString(),
    }
    setUsers(prev => ({
      ...prev,
      [userProfile.id]: profileUser,
    }))
  }, [userProfile])

  // Carga y sincronización de servidores desde el backend
  const refreshServers = useCallback(async () => {
    if (!token) return
    try {
      const serverList = await getServers()
      if (Array.isArray(serverList)) {
        setServers(serverList)
      }
    } catch {
      // Si falla la red o el endpoint no responde, conserva los existentes
    }
  }, [token])

  useEffect(() => {
    refreshServers()
  }, [refreshServers])

  const createServer = useCallback(async (name: string, icon?: any): Promise<Server> => {
    const newServer = await apiCreateServer({ name, icon })
    setServers(prev => [...prev, newServer])
    return newServer
  }, [])

  const createChannel = useCallback(
    async (
      serverId: string,
      data: { name: string; type: 'text' | 'voice'; categoryId?: string },
    ): Promise<Channel> => {
      const newChannel = await apiCreateChannel(serverId, data)
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

  const isDm = useCallback((channelId: string) => channelId.startsWith('dm-'), [])

  // Consulta de mensajes de canal en Chat-Engine-Service
  const fetchChannelMessages = useCallback(
    async (channelId: string) => {
      if (!token || isDm(channelId)) return
      try {
        const response = await apiFetch<{ messages: any[] } | any[]>(
          `/api/v1/chat/channels/${channelId}/messages?limit=50`,
        )
        const rawList = Array.isArray(response) ? response : response?.messages || []
        const formatted: Message[] = rawList.map(m => ({
          id: m.id || m._id || `msg-${Date.now()}`,
          channelId: m.channelId || m.channel_id || channelId,
          userId: m.authorId || m.author_id || m.userId || m.user_id || activeUserId,
          authorId: m.authorId || m.author_id || m.userId || activeUserId,
          content: m.content || '',
          createdAt: m.createdAt || m.created_at || m.timestamp || new Date().toISOString(),
          timestamp: m.createdAt || m.created_at || m.timestamp || new Date().toISOString(),
          type: m.type || 'normal',
          status: 'sent' as const,
        }))
        setMessages(prev => ({ ...prev, [channelId]: formatted }))
      } catch {
        // En caso de error, se preservan los mensajes locales en memoria
      }
    },
    [token, activeUserId, isDm],
  )

  const addOptimisticMessage = useCallback(
    (channelId: string, content: string): string => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const now = new Date().toISOString()
      const newMessage: Message = {
        id: tempId,
        channelId,
        userId: activeUserId,
        authorId: activeUserId,
        content,
        timestamp: now,
        createdAt: now,
        type: 'normal',
        status: 'pending',
      }
      setMessages(prev => ({
        ...prev,
        [channelId]: [...(prev[channelId] ?? []), newMessage],
      }))
      return tempId
    },
    [activeUserId],
  )

  const confirmOptimisticMessage = useCallback(
    (channelId: string, payload: MessageBackendPayload) => {
      setMessages(prev => {
        const list = prev[channelId] ?? []
        // Si ya existe este ID exacto (por ejemplo reconexión/duplicado), asegurarse de que esté como sent
        const existingIndex = list.findIndex(m => m.id === payload.id)
        if (existingIndex !== -1) {
          const updated = [...list]
          updated[existingIndex] = {
            ...updated[existingIndex],
            status: 'sent',
            content: payload.content,
          }
          return { ...prev, [channelId]: updated }
        }

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
              id: payload.id,
              authorId: payload.authorId,
              userId: payload.authorId,
              content: payload.content,
              createdAt: payload.createdAt,
              timestamp: payload.createdAt,
              status: 'sent',
            }
            return { ...prev, [channelId]: updated }
          }
        }

        // Si es de otro usuario o no se encontró pendiente, agregarlo a la lista
        const newMsg: Message = {
          id: payload.id,
          channelId: payload.channelId || channelId,
          userId: payload.authorId,
          authorId: payload.authorId,
          content: payload.content,
          createdAt: payload.createdAt,
          timestamp: payload.createdAt,
          type: 'normal',
          status: 'sent',
        }
        return { ...prev, [channelId]: [...list, newMsg] }
      })
    },
    [activeUserId],
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

  const sendMessage = useCallback(
    (channelId: string, content: string) => {
      const clientMessageId = `local-${Date.now()}`
      const newMessage: Message = {
        id: clientMessageId,
        channelId,
        userId: activeUserId,
        authorId: activeUserId,
        content,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        type: 'normal',
      }

      // 1. Actualización optimista inmediata en la UI
      const setter = isDm(channelId) ? setDmMessages : setMessages
      setter(prev => ({
        ...prev,
        [channelId]: [...(prev[channelId] ?? []), newMessage],
      }))

      // 2. Envío asíncrono al backend si existe token activo y no es DM mock
      if (token && !isDm(channelId)) {
        apiFetch(`/api/v1/chat/channels/${channelId}/messages`, {
          method: 'POST',
          body: {
            content,
            clientMessageId,
          },
        }).catch(() => {
          // El mensaje ya quedó de forma optimista en la interfaz
        })
      }
    },
    [activeUserId, isDm, token],
  )

  const editMessage = useCallback(
    (channelId: string, messageId: string, content: string) => {
      const setter = isDm(channelId) ? setDmMessages : setMessages
      setter(prev => ({
        ...prev,
        [channelId]: (prev[channelId] ?? []).map(m =>
          m.id === messageId ? { ...m, content, edited: true } : m,
        ),
      }))
    },
    [isDm],
  )

  const deleteMessage = useCallback(
    (channelId: string, messageId: string) => {
      const setter = isDm(channelId) ? setDmMessages : setMessages
      setter(prev => ({
        ...prev,
        [channelId]: (prev[channelId] ?? []).map(m =>
          m.id === messageId
            ? { ...m, type: 'deleted', content: '[This message was deleted]' }
            : m,
        ),
      }))
    },
    [isDm],
  )

  const toggleReaction = useCallback(
    (channelId: string, messageId: string, emoji: string) => {
      const setter = isDm(channelId) ? setDmMessages : setMessages
      setter(prev => ({
        ...prev,
        [channelId]: (prev[channelId] ?? []).map(m => {
          if (m.id !== messageId) return m
          const reactions = m.reactions ?? []
          const existing = reactions.find(r => r.emoji === emoji)
          if (!existing) {
            return { ...m, reactions: [...reactions, { emoji, count: 1, reacted: true }] }
          }
          const updated = existing.reacted
            ? { ...existing, count: existing.count - 1, reacted: false }
            : { ...existing, count: existing.count + 1, reacted: true }
          return {
            ...m,
            reactions: reactions
              .map(r => (r.emoji === emoji ? updated : r))
              .filter(r => r.count > 0),
          }
        }),
      }))
    },
    [isDm],
  )

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const value = useMemo<DataContextValue>(
    () => ({
      currentUserId: activeUserId,
      users,
      servers,
      messages,
      directMessages,
      dmMessages,
      notifications,
      auditLog,
      refreshServers,
      createServer,
      createChannel,
      sendMessage,
      addOptimisticMessage,
      confirmOptimisticMessage,
      failOptimisticMessage,
      editMessage,
      deleteMessage,
      toggleReaction,
      markNotificationRead,
      markAllNotificationsRead,
      fetchChannelMessages,
    }),
    [
      activeUserId,
      users,
      servers,
      messages,
      directMessages,
      dmMessages,
      notifications,
      auditLog,
      refreshServers,
      createServer,
      createChannel,
      sendMessage,
      addOptimisticMessage,
      confirmOptimisticMessage,
      failOptimisticMessage,
      editMessage,
      deleteMessage,
      toggleReaction,
      markNotificationRead,
      markAllNotificationsRead,
      fetchChannelMessages,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>')
  return ctx
}
