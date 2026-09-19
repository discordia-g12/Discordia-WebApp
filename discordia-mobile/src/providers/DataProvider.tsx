import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
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
  Message,
  DirectMessage,
  Notification,
  AuditEntry,
} from '../types'

interface DataContextValue {
  currentUserId: string
  users: Record<string, User>
  servers: Server[]
  messages: Record<string, Message[]>
  directMessages: DirectMessage[]
  dmMessages: Record<string, Message[]>
  notifications: Notification[]
  auditLog: AuditEntry[]

  // Mutaciones locales — solo cambian el estado en memoria, no hay backend.
  sendMessage: (channelId: string, content: string) => void
  editMessage: (channelId: string, messageId: string, content: string) => void
  deleteMessage: (channelId: string, messageId: string) => void
  toggleReaction: (channelId: string, messageId: string, emoji: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

// TODO(persistencia opcional): si en algún momento quieren que el estado
// sobreviva a reinicios de la app, acá es donde se leería/escribiría con
// @react-native-async-storage/async-storage — guardando solo lo que cambió
// (ej. `messages`), no todo el mock de una.

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [users] = useState<Record<string, User>>(USERS)
  const [servers] = useState<Server[]>(SERVERS)
  const [messages, setMessages] = useState<Record<string, Message[]>>(MESSAGES)
  const [directMessages] = useState<DirectMessage[]>(DIRECT_MESSAGES)
  const [dmMessages, setDmMessages] = useState<Record<string, Message[]>>(DM_MESSAGES)
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS)
  const [auditLog] = useState<AuditEntry[]>(AUDIT_LOG)

  const isDm = useCallback((channelId: string) => channelId.startsWith('dm-'), [])

  const sendMessage = useCallback(
    (channelId: string, content: string) => {
      const newMessage: Message = {
        id: `local-${Date.now()}`,
        channelId,
        userId: CURRENT_USER_ID,
        content,
        timestamp: new Date().toISOString(),
        type: 'normal',
      }
      const setter = isDm(channelId) ? setDmMessages : setMessages
      setter(prev => ({ ...prev, [channelId]: [...(prev[channelId] ?? []), newMessage] }))
    },
    [isDm],
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
          m.id === messageId ? { ...m, type: 'deleted', content: '[This message was deleted]' } : m,
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
      currentUserId: CURRENT_USER_ID,
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
    }),
    [
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
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData debe usarse dentro de <DataProvider>')
  return ctx
}
