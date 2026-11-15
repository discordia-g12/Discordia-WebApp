import { useConversationsQuery, useFriendRequestsQuery, useInbox } from '@discordia/core'

/**
 * Socket inbox de la sesión: se monta una sola vez, en MobileShell. En segundo plano se suelta; al volver, reconecta
 * y refresca. `activeUserId`: el usuario del chat abierto, cuyos mensajes no suman no leídos.
 */
export function useDmInbox({
  activeUserId,
  appActive,
  onServerUpdated,
  onServerDeleted,
}: {
  activeUserId: string | null
  appActive: boolean
  onServerUpdated?: (serverId: string) => void
  onServerDeleted?: (serverId: string) => void
}) {
  const { data: conversations } = useConversationsQuery()
  const { data: friendRequests } = useFriendRequestsQuery()

  const activeConversationId = activeUserId
    ? (conversations?.find(c => c.otherUserId === activeUserId)?.id ?? null)
    : null
  const inbox = useInbox({ activeConversationId, enabled: appActive, onServerUpdated, onServerDeleted })

  const unread = (conversations ?? []).reduce((total, c) => total + c.unreadCount, 0)
  return { ...inbox, unread: unread + (friendRequests?.incoming.length ?? 0) }
}
