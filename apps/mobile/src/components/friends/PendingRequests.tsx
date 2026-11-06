import React from 'react'
import { SectionList, View } from 'react-native'
import {
  useAcceptFriendRequestMutation,
  useCancelFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useFriendRequestsQuery,
  type FriendRequest,
} from '@discordia/core'
import { useUI } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { ActionLink, EmptyState, SectionLabel } from '../../ui'
import { ListStatus } from './ListStatus'
import { PersonRow } from './PersonRow'

interface PendingRequestsProps {
  onOpenChat: (userId: string) => void
  onOpenProfile: (userId: string) => void
}

/** PENDIENTE: solicitudes de amistad recibidas (aceptar o rechazar) y enviadas (cancelar). */
export function PendingRequests({ onOpenChat, onOpenProfile }: PendingRequestsProps) {
  const styles = useStyles()
  const { showToast } = useUI()
  const requests = useFriendRequestsQuery()
  const accept = useAcceptFriendRequestMutation()
  const decline = useDeclineFriendRequestMutation()
  const cancel = useCancelFriendRequestMutation()
  const busy = accept.isPending || decline.isPending || cancel.isPending

  if (requests.isLoading || requests.isError) {
    return <ListStatus loading={requests.isLoading} label="las solicitudes" onRetry={() => requests.refetch()} />
  }

  const incoming = requests.data?.incoming ?? []
  const outgoing = requests.data?.outgoing ?? []
  const sections = [
    ...(incoming.length ? [{ title: 'Recibidas', data: incoming, received: true }] : []),
    ...(outgoing.length ? [{ title: 'Enviadas', data: outgoing, received: false }] : []),
  ]

  const failed = (message: string) => ({ onError: () => showToast(message, 'error') })

  const row = (request: FriendRequest, received: boolean) => (
    <PersonRow
      name={request.user.displayName}
      username={request.user.username}
      avatar={request.user.avatarUrl}
      subtitle={request.message || `@${request.user.username}`}
      onPress={() => onOpenChat(request.user.id)}
      onPressAvatar={() => onOpenProfile(request.user.id)}
      trailing={
        received ? (
          <>
            <ActionLink
              disabled={busy}
              accessibilityLabel={`Aceptar a ${request.user.displayName}`}
              onPress={() => accept.mutate(request.id, failed('No se pudo aceptar la solicitud.'))}
            >
              aceptar
            </ActionLink>
            <ActionLink
              disabled={busy}
              accessibilityLabel={`Rechazar a ${request.user.displayName}`}
              onPress={() =>
                decline.mutate({ requestId: request.id, userId: request.user.id }, failed('No se pudo rechazar la solicitud.'))
              }
            >
              rechazar
            </ActionLink>
          </>
        ) : (
          <ActionLink
            disabled={busy}
            accessibilityLabel={`Cancelar la solicitud a ${request.user.displayName}`}
            onPress={() =>
              cancel.mutate({ requestId: request.id, userId: request.user.id }, failed('No se pudo cancelar la solicitud.'))
            }
          >
            cancelar
          </ActionLink>
        )
      }
    />
  )

  return (
    <SectionList
      sections={sections}
      keyExtractor={request => request.id}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      renderSectionHeader={({ section }) => (
        <View style={styles.label}>
          <SectionLabel>{section.title}</SectionLabel>
        </View>
      )}
      renderItem={({ item, section }) => row(item, section.received)}
      ListEmptyComponent={
        <View style={styles.empty}>
          <EmptyState title="no hay solicitudes pendientes" hint="las que recibas y mandes aparecen acá" />
        </View>
      }
    />
  )
}

const useStyles = makeStyles(t => ({
  label: { paddingTop: t.space[4] },
  empty: { paddingVertical: t.space[5], paddingHorizontal: t.space[4] },
}))
