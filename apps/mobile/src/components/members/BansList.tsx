import React from 'react'
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  ApiError,
  unbanErrorMessage,
  useServerBansQuery,
  useUnbanMemberMutation,
  type ServerBan,
} from '@discordia/core'
import { colors, radii, spacing, typography } from '../../theme'
import { useUI } from '../../providers/AppProviders'
import { useUserDisplay } from '../../hooks/useUserProfiles'

interface BansListProps {
  serverId: string | null
}

/**
 * Usuarios baneados del servidor, con la opción de revocar el baneo para que puedan
 * volver a unirse con una invitación. Requiere BAN_MEMBERS; el backend valida el permiso.
 */
export default function BansList({ serverId }: BansListProps) {
  const { showToast } = useUI()
  const bansQuery = useServerBansQuery(serverId)
  const unbanMutation = useUnbanMemberMutation(serverId as string)

  const bans: ServerBan[] = bansQuery.data ?? []
  const describeUser = useUserDisplay(bans.map(ban => ban.userId))
  const isForbidden = bansQuery.error instanceof ApiError && bansQuery.error.status === 403

  const handleUnban = (ban: ServerBan) => {
    const { name } = describeUser(ban.userId)
    Alert.alert('Revocar baneo', `${name} va a poder volver a unirse al servidor con una invitación.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Revocar',
        style: 'destructive',
        onPress: async () => {
          try {
            await unbanMutation.mutateAsync(ban.userId)
            showToast?.(`Se revocó el baneo de ${name}.`, 'success')
          } catch (err) {
            showToast?.(unbanErrorMessage(err), 'error')
            // Si otro moderador ya lo desbaneó, la lista quedó desactualizada
            if (err instanceof ApiError && err.status === 404) bansQuery.refetch()
          }
        },
      },
    ])
  }

  const renderBan = ({ item: ban }: { item: ServerBan }) => {
    const { name } = describeUser(ban.userId)
    return (
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta} numberOfLines={2}>
            {ban.reason ? `Motivo: ${ban.reason}` : 'Sin motivo'} · {new Date(ban.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Pressable
          style={styles.unbanButton}
          onPress={() => handleUnban(ban)}
          disabled={unbanMutation.isPending}
        >
          <Text style={styles.unbanText}>Revocar</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <>
      {bansQuery.isLoading && (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {bansQuery.isError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {isForbidden
              ? 'Necesitás el permiso "Ban Members" para ver y revocar los baneos de este servidor.'
              : 'No se pudieron cargar los baneos.'}
          </Text>
          {!isForbidden && (
            <Pressable onPress={() => bansQuery.refetch()}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          )}
        </View>
      )}

      {bansQuery.isSuccess && (
        <FlatList
          data={bans}
          keyExtractor={ban => ban.id}
          renderItem={renderBan}
          style={styles.list}
          contentContainerStyle={{ paddingVertical: spacing.xs }}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay usuarios baneados en este servidor.</Text>}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  centerBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(237, 66, 69, 0.15)',
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  errorText: {
    ...typography.metadata,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  retryText: {
    ...typography.button,
    color: colors.accent,
  },
  list: {
    maxHeight: 460,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.button,
    color: colors.accentFg,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.messageText,
    color: colors.text,
  },
  meta: {
    ...typography.metadata,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  unbanButton: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  unbanText: {
    ...typography.button,
    color: colors.text,
  },
  emptyText: {
    ...typography.helperText,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
})
