import React from 'react'
import { FlatList, View } from 'react-native'
import { useBlocksQuery, useUnblockUserMutation } from '@discordia/core'
import { useUI } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { ActionLink, EmptyState } from '../../ui'
import { ListStatus } from './ListStatus'
import { PersonRow } from './PersonRow'

/** BLOQUEADO: a quién bloqueó el usuario, con _desbloquear. */
export function BlockedList({ onOpenProfile }: { onOpenProfile: (userId: string) => void }) {
  const styles = useStyles()
  const { showToast } = useUI()
  const blocks = useBlocksQuery()
  const unblock = useUnblockUserMutation()

  if (blocks.isLoading || blocks.isError) {
    return <ListStatus loading={blocks.isLoading} label="los bloqueados" onRetry={() => blocks.refetch()} />
  }

  return (
    <FlatList
      data={blocks.data ?? []}
      keyExtractor={user => user.id}
      ListEmptyComponent={
        <View style={styles.empty}>
          <EmptyState title="no bloqueaste a nadie" hint="a quien bloquees lo vas a ver acá" />
        </View>
      }
      renderItem={({ item }) => (
        <PersonRow
          name={item.displayName}
          username={item.username}
          avatar={item.avatarUrl}
          subtitle={`@${item.username}`}
          onPressAvatar={() => onOpenProfile(item.id)}
          trailing={
            <ActionLink
              disabled={unblock.isPending}
              accessibilityLabel={`Desbloquear a ${item.displayName}`}
              onPress={() =>
                unblock.mutate(item.id, {
                  onSuccess: () => showToast('Usuario desbloqueado', 'success'),
                  onError: () => showToast('No se pudo desbloquear.', 'error'),
                })
              }
            >
              desbloquear
            </ActionLink>
          }
        />
      )}
    />
  )
}

const useStyles = makeStyles(t => ({
  empty: { paddingVertical: t.space[5], paddingHorizontal: t.space[4] },
}))
