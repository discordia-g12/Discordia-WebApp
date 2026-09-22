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
  ServerBackendResponse,
  Message,
  DirectMessage,
  Notification,
  AuditEntry,
} from '../types'
import { useAuth } from './AuthProvider'
import { apiFetch } from '../api/client'

interface DataContextValue {
  currentUserId: string
  users: Record<string, User>
  servers: Server[]
  messages: Record<string, Message[]>
  directMessages: DirectMessage[]
  dmMessages: Record<string, Message[]>
  notifications: Notification[]
  auditLog: AuditEntry[]

  // Mutaciones y sincronización
  sendMessage: (channelId: string, content: string) => void
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

  // Carga inicial de servidores desde el backend si el token está disponible
  useEffect(() => {
    if (!token) return

    apiFetch<ServerBackendResponse[]>('/api/v1/servers')
      .then(serverList => {
        if (Array.isArray(serverList) && serverList.length > 0) {
          const mapped: Server[] = serverList.map((s, idx) => {
            const mappedChannels = (s.channels || []).map(ch => ({
              id: ch.id,
              name: ch.name,
              type: ch.type,
              serverId: ch.server_id,
              categoryId: ch.category_id,
              position: ch.position,
            }))
            return {
              id: s.id || `srv-${idx}`,
              name: s.name,
              icon: s.icon_url || null,
              iconUrl: s.icon_url || null,
              color: '#7c5cfc',
              ownerId: s.owner_id || activeUserId,
              memberCount: 1,
              boostLevel: 0,
              boostCount: 0,
              channels: mappedChannels,
              categories: [
                {
                  id: `cat-${s.id}-gen`,
                  name: 'GENERAL',
                  channels: mappedChannels.length > 0 ? mappedChannels : [
                    { id: `ch-${s.id}-general`, name: 'general', type: 'text' as const },
                  ],
                },
              ],
              members: [activeUserId],
              roles: [],
            }
          })
          setServers(mapped)
        }
      })
      .catch(() => {
        // En caso de que el backend no tenga servidores o falle, conserva los mocks por defecto
      })
  }, [token])

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
        }))
        setMessages(prev => ({ ...prev, [channelId]: formatted }))
      } catch {
        // En caso de error, se preservan los mensajes locales en memoria
      }
    },
    [token, activeUserId, isDm],
  )

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
      sendMessage,
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
      sendMessage,
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
