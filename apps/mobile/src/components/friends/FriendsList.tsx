import React, { useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import { useFriendsQuery, usePresenceQuery, type PublicProfile } from '@discordia/core'
import { makeStyles } from '../../theme'
import { EmptyState, UnderlineInput } from '../../ui'
import { ListStatus } from './ListStatus'
import { PersonRow } from './PersonRow'

function matches(friend: PublicProfile, search: string): boolean {
  const term = search.trim().toLowerCase()
  return friend.displayName.toLowerCase().includes(term) || friend.username.toLowerCase().includes(term)
}

interface FriendsListProps {
  onOpenChat: (userId: string) => void
  onOpenProfile: (userId: string) => void
}

/** TODOS: los amigos, con buscador por nombre o usuario. */
export function FriendsList({ onOpenChat, onOpenProfile }: FriendsListProps) {
  const styles = useStyles()
  const friends = useFriendsQuery()
  const [search, setSearch] = useState('')
  const userIds = useMemo(() => (friends.data ?? []).map(f => f.id), [friends.data])
  const { data: presence } = usePresenceQuery(userIds)
  const shown = useMemo(() => (friends.data ?? []).filter(f => matches(f, search)), [friends.data, search])

  if (friends.isLoading || friends.isError) {
    return <ListStatus loading={friends.isLoading} label="tus amigos" onRetry={() => friends.refetch()} />
  }

  return (
    <FlatList
      data={shown}
      keyExtractor={friend => friend.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.search}>
          <UnderlineInput
            label="buscar"
            value={search}
            onChangeText={setSearch}
            placeholder="nombre o usuario"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          {search ? (
            <EmptyState title="sin resultados" hint="probá con otro nombre" />
          ) : (
            <EmptyState title="por ahora no hay amigos" hint="sumá a alguien desde añadir" />
          )}
        </View>
      }
      renderItem={({ item }) => (
        <PersonRow
          name={item.displayName}
          username={item.username}
          avatar={item.avatarUrl}
          presence={presence?.[item.id]}
          subtitle={item.customStatus || `@${item.username}`}
          onPress={() => onOpenChat(item.id)}
          onPressAvatar={() => onOpenProfile(item.id)}
        />
      )}
    />
  )
}

const useStyles = makeStyles(t => ({
  search: { paddingVertical: t.space[3], paddingHorizontal: t.space[4] },
  empty: { paddingVertical: t.space[4], paddingHorizontal: t.space[4] },
}))
