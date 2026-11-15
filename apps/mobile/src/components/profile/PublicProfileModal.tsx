import React, { useState } from 'react'
import { View } from 'react-native'
import {
  dmActions,
  isProfileUnavailable,
  useMutualServersQuery,
  usePresenceQuery,
  usePublicProfileQuery,
  type PublicProfile,
} from '@discordia/core'
import { useRelationshipActions } from '../../hooks/useRelationshipActions'
import { makeStyles } from '../../theme'
import { ActionLink, BlockButton, EmptyState, Modal, Skeleton, SquareAvatar, Text } from '../../ui'

interface PublicProfileModalProps {
  /** El usuario a mostrar; null: cerrado. */
  userId: string | null
  onClose: () => void
  onMessage: (userId: string) => void
}

/** Perfil público de otro usuario: nombre, foto, descripción, estado, servidores en común y lo que se puede hacer. */
export default function PublicProfileModal({ userId, onClose, onMessage }: PublicProfileModalProps) {
  // El último abierto: mientras la cortina sube, el contenido sigue ahí
  const [shownId, setShownId] = useState(userId)
  if (userId && userId !== shownId) setShownId(userId)

  const { data: profile } = usePublicProfileQuery(shownId)

  return (
    <Modal visible={!!userId} title={profile?.displayName ?? 'Perfil'} onClose={onClose}>
      {shownId && <ProfileBody key={shownId} userId={shownId} onClose={onClose} onMessage={onMessage} />}
    </Modal>
  )
}

function ProfileBody({ userId, onClose, onMessage }: { userId: string; onClose: () => void; onMessage: (userId: string) => void }) {
  const styles = useStyles()
  const profileQuery = usePublicProfileQuery(userId)
  const profile = profileQuery.data

  if (profileQuery.isLoading) return <Skeleton lines={5} label="Cargando el perfil" />
  if (!profile) {
    return isProfileUnavailable(profileQuery.error) ? (
      <EmptyState title="perfil no disponible" hint="esta cuenta no existe o está suspendida" />
    ) : (
      <View style={styles.block}>
        <Text variant="bodySmall">No se pudo cargar el perfil.</Text>
        <ActionLink onPress={() => profileQuery.refetch()}>reintentar</ActionLink>
      </View>
    )
  }

  return <ProfileDetails userId={userId} profile={profile} onClose={onClose} onMessage={onMessage} />
}

function ProfileDetails({
  userId,
  profile,
  onClose,
  onMessage,
}: {
  userId: string
  profile: PublicProfile
  onClose: () => void
  onMessage: (userId: string) => void
}) {
  const styles = useStyles()
  // Con el id con el que se abrió: los miembros están guardados con el `sub` crudo y un alias no pierde servidores
  const mutualServers = useMutualServersQuery(userId)
  const { data: presence } = usePresenceQuery([userId])
  const relation = useRelationshipActions(userId, profile)
  const actions = dmActions({ relationship: profile.relationship })
  const [confirming, setConfirming] = useState<'block' | 'remove' | null>(null)

  return (
    <View style={styles.root}>
      <View style={styles.identity}>
        <SquareAvatar
          user={{ username: profile.username, displayName: profile.displayName, avatar: profile.avatarUrl }}
          size="lg"
          status={presence?.[userId]}
        />
        <View style={styles.flex}>
          <Text variant="meta" tone="muted">
            @{profile.username}
          </Text>
          {!!profile.customStatus && <Text variant="bodySmall">{profile.customStatus}</Text>}
        </View>
      </View>

      {!!profile.bio && (
        <View style={styles.block}>
          <Text variant="label">sobre mí /</Text>
          <Text variant="bodySmall">{profile.bio}</Text>
        </View>
      )}

      <View style={styles.block}>
        <Text variant="label">servidores en común /</Text>
        {mutualServers.isLoading ? (
          <Skeleton lines={2} label="Cargando los servidores en común" />
        ) : mutualServers.isError ? (
          <ActionLink onPress={() => mutualServers.refetch()}>reintentar</ActionLink>
        ) : mutualServers.data?.length ? (
          mutualServers.data.map(server => (
            <Text key={server.id} variant="bodySmall">
              •{server.name}
            </Text>
          ))
        ) : (
          <Text variant="meta" tone="muted">
            / ninguno por ahora
          </Text>
        )}
      </View>

      {confirming ? (
        <View style={styles.block}>
          <Text variant="bodySmall">
            {confirming === 'block'
              ? `¿Bloquear a ${profile.displayName}? No van a poder escribirse hasta que lo desbloquees. El historial se conserva.`
              : `¿Eliminar a ${profile.displayName} de tus amigos? La conversación y el historial se conservan.`}
          </Text>
          <View style={styles.links}>
            <ActionLink onPress={() => setConfirming(null)}>cancelar</ActionLink>
            <BlockButton
              tone="danger"
              loading={relation.busy}
              onPress={async () => {
                await (confirming === 'block' ? relation.block() : relation.removeFriend())
                setConfirming(null)
              }}
            >
              {confirming === 'block' ? 'Bloquear' : 'Eliminar'}
            </BlockButton>
          </View>
        </View>
      ) : (
        <View style={styles.links}>
          {actions.canMessage && (
            <BlockButton
              onPress={() => {
                onMessage(userId)
                onClose()
              }}
            >
              Enviar mensaje
            </BlockButton>
          )}
          {actions.canAddFriend && !relation.requestSent && (
            <ActionLink disabled={relation.busy} onPress={relation.addFriend}>
              agregar amigo
            </ActionLink>
          )}
          {relation.requestSent && <ActionLink disabled>solicitud enviada</ActionLink>}
          {actions.canCancelFriendRequest && (
            <ActionLink disabled={relation.busy} onPress={relation.cancelRequest}>
              cancelar solicitud
            </ActionLink>
          )}
          {actions.canRespondFriendRequest && (
            <>
              <ActionLink disabled={relation.busy} onPress={relation.acceptRequest}>
                aceptar solicitud
              </ActionLink>
              <ActionLink disabled={relation.busy} onPress={relation.declineRequest}>
                rechazar solicitud
              </ActionLink>
            </>
          )}
          {actions.canRemoveFriend && (
            <ActionLink disabled={relation.busy} onPress={() => setConfirming('remove')}>
              eliminar amigo
            </ActionLink>
          )}
          {actions.canBlock && (
            <ActionLink disabled={relation.busy} onPress={() => setConfirming('block')}>
              bloquear
            </ActionLink>
          )}
          {actions.canUnblock && (
            <ActionLink disabled={relation.busy} onPress={relation.unblock}>
              desbloquear
            </ActionLink>
          )}
        </View>
      )}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  root: { gap: t.space[5] },
  flex: { flex: 1, gap: t.space[1] },
  identity: { flexDirection: 'row', alignItems: 'center', gap: t.space[4] },
  block: { gap: t.space[2] },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: t.space[5], rowGap: t.space[3] },
}))
