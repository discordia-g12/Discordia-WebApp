import React, { useMemo } from 'react'
import { FlatList, View } from 'react-native'
import {
  buildDmList,
  useConversationsQuery,
  useFriendRequestsQuery,
  usePresenceQuery,
  type DmListItem,
} from '@discordia/core'
import { useUserDisplay } from '../../hooks/useUserProfiles'
import { makeStyles } from '../../theme'
import { EmptyState } from '../../ui'
import { ListStatus } from './ListStatus'
import { PersonRow } from './PersonRow'

function preview(item: DmListItem): string {
  if (item.kind === 'friend_request') return 'solicitud de amistad'
  if (item.kind === 'waiting_reply') return 'esperando respuesta'
  const last = item.conversation.lastMessage
  const text = last?.content || (last ? 'adjunto' : '')
  if (item.kind === 'message_request') return `solicitud de mensaje: ${text}`
  return last && last.authorId !== item.userId ? `vos: ${text}` : text
}

interface DmListProps {
  onOpenChat: (userId: string) => void
  onOpenProfile: (userId: string) => void
}

/** La lista "como un chat más": conversaciones y solicitudes (de mensaje y de amistad), lo más reciente arriba. */
export function DmList({ onOpenChat, onOpenProfile }: DmListProps) {
  const styles = useStyles()
  const conversations = useConversationsQuery()
  const friendRequests = useFriendRequestsQuery()
  const items = useMemo(
    () => buildDmList(conversations.data, friendRequests.data?.incoming),
    [conversations.data, friendRequests.data],
  )
  const userIds = useMemo(() => items.map(item => item.userId), [items])
  const describeUser = useUserDisplay(userIds)
  const { data: presence } = usePresenceQuery(userIds)

  if (conversations.isLoading || conversations.isError) {
    return <ListStatus loading={conversations.isLoading} label="tus mensajes" onRetry={() => conversations.refetch()} />
  }

  return (
    <FlatList
      data={items}
      keyExtractor={item => item.key}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        <View style={styles.empty}>
          <EmptyState title="todavía no hay mensajes" hint="escribile a un amigo o sumá a alguien nuevo" />
        </View>
      }
      renderItem={({ item }) => {
        const user = item.kind === 'friend_request' ? item.friendRequest.user : null
        const shown = describeUser(item.userId)
        return (
          <PersonRow
            name={user?.displayName ?? shown.name}
            username={user?.username}
            avatar={user?.avatarUrl ?? shown.avatar}
            presence={presence?.[item.userId]}
            subtitle={preview(item)}
            unread={item.kind === 'friend_request' ? 1 : item.conversation.unreadCount}
            onPress={() => onOpenChat(item.userId)}
            onPressAvatar={() => onOpenProfile(item.userId)}
          />
        )
      }}
    />
  )
}

const useStyles = makeStyles(t => ({
  empty: { paddingVertical: t.space[5], paddingHorizontal: t.space[4] },
}))
