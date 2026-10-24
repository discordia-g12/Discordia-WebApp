import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { User, Server, Category, Channel, Message, MessageBackendPayload } from '../types'
import { useAuth } from './AuthProvider'
import {
  getMessages,
  getServers,
  sendMessage as apiSendMessage,
  createServer as apiCreateServer,
  createChannel as apiCreateChannel,
  editChannel as apiEditChannel,
  deleteChannel as apiDeleteChannel,
  leaveServer as apiLeaveServer,
  deleteServer as apiDeleteServer,
  createCategory as apiCreateCategory,
  reorderChannels as apiReorderChannels,
  reorderCategories as apiReorderCategories,
} from '@discordia/core'

interface DataContextValue {
  currentUserId: string
  /** Usuarios conocidos (por ahora, el propio); el resto se pide con useUserDisplay. */
  users: Record<string, User>
  servers: Server[]
  /** Ya respondió el backend (o falló): distingue "cargando" de "no tenés servidores". */
  serversLoaded: boolean
  messages: Record<string, Message[]>

  // Servidores y canales en vivo
  refreshServers: () => Promise<void>
  createServer: (name: string, icon?: any) => Promise<Server>
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

  // Mutaciones y sincronización
  sendMessage: (channelId: string, content: string) => void
  addOptimisticMessage: (channelId: string, content: string) => string
  confirmOptimisticMessage: (channelId: string, payload: MessageBackendPayload) => void
  failOptimisticMessage: (channelId: string) => void
  fetchChannelMessages: (channelId: string) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { token, userProfile } = useAuth()

  const activeUserId = userProfile?.id ?? ''

  const [users, setUsers] = useState<Record<string, User>>({})
  const [servers, setServers] = useState<Server[]>([])
  const [serversLoaded, setServersLoaded] = useState(false)
  const [messages, setMessages] = useState<Record<string, Message[]>>({})

  // Sincronizar el perfil del usuario autenticado en el diccionario de usuarios
  useEffect(() => {
    if (!userProfile) return
    const profileUser: User = {
      id: userProfile.id,
      username: userProfile.username,
      displayName: userProfile.display_name || userProfile.username,
      avatar: userProfile.avatar_url || undefined,
      status: (userProfile.activity_status as User['status']) || 'online',
      customStatus: userProfile.custom_status,
      bio: userProfile.bio,
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

  // Mensajes de un canal (Chat-Engine-Service). Si falla, quedan los que ya había
  const fetchChannelMessages = useCallback(
    async (channelId: string) => {
      if (!token) return
      try {
        const list = await getMessages(channelId)
        setMessages(prev => ({ ...prev, [channelId]: list.map(m => ({ ...m, status: 'sent' as const })) }))
      } catch {
        // sin red: se conservan los mensajes en memoria
      }
    },
    [token],
  )

  const addOptimisticMessage = useCallback(
    (channelId: string, content: string): string => {
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

  // Envío por REST (el normal es por el WebSocket del canal): se muestra al instante y queda enviado o fallido
  const sendMessage = useCallback(
    (channelId: string, content: string) => {
      const tempId = addOptimisticMessage(channelId, content)
      apiSendMessage(channelId, content, tempId)
        .then(sent => confirmOptimisticMessage(channelId, { ...sent, createdAt: sent.createdAt ?? sent.timestamp }))
        .catch(() => failOptimisticMessage(channelId))
    },
    [addOptimisticMessage, confirmOptimisticMessage, failOptimisticMessage],
  )

  const value = useMemo<DataContextValue>(
    () => ({
      currentUserId: activeUserId,
      users,
      servers,
      serversLoaded,
      messages,
      refreshServers,
      createServer,
      createChannel,
      editChannel,
      deleteChannel,
      createCategory,
      reorderChannels,
      reorderCategories,
      leaveServer,
      deleteServer,
      sendMessage,
      addOptimisticMessage,
      confirmOptimisticMessage,
      failOptimisticMessage,
      fetchChannelMessages,
    }),
    [
      activeUserId,
      users,
      servers,
      serversLoaded,
      messages,
      refreshServers,
      createServer,
      createChannel,
      editChannel,
      deleteChannel,
      createCategory,
      reorderChannels,
      reorderCategories,
      leaveServer,
      deleteServer,
      sendMessage,
      addOptimisticMessage,
      confirmOptimisticMessage,
      failOptimisticMessage,
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
