import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import { ChevronDown, ChevronRight, Crown, Users, X } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../../theme'
import { useUI } from '../../providers/AppProviders'
import { useAssignRoleMutation, useRemoveRoleMutation, useRolesQuery } from '../../hooks/useRoles'
import { useServerMembersQuery } from '../../hooks/useServerMembers'
import { useUserDisplay } from '../../hooks/useUserProfiles'
import type { ServerMember, ServerRole } from '../../types'

interface MembersModalProps {
  visible: boolean
  serverId: string | null
  ownerId: string | null
  onClose: () => void
}

export default function MembersModal({ visible, serverId, ownerId, onClose }: MembersModalProps) {
  const { showToast } = useUI()
  const membersQuery = useServerMembersQuery(visible ? serverId : null)
  const rolesQuery = useRolesQuery(visible ? serverId : null)
  const assignMutation = useAssignRoleMutation(serverId as string)
  const removeMutation = useRemoveRoleMutation(serverId as string)

  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)

  const members: ServerMember[] = useMemo(
    () => membersQuery.data?.pages.flatMap(page => page.items) ?? [],
    [membersQuery.data],
  )
  const total = membersQuery.data?.pages[0]?.total ?? 0
  const describeUser = useUserDisplay(members.map(member => member.userId))
  const roles: ServerRole[] = rolesQuery.data ?? []
  const rolesById = useMemo(() => new Map(roles.map(role => [role.id, role])), [roles])
  const assignableRoles = roles.filter(role => !role.isDefault)
  const isMutating = assignMutation.isPending || removeMutation.isPending

  const handleClose = () => {
    setExpandedMemberId(null)
    onClose()
  }

  const handleToggleRole = async (member: ServerMember, role: ServerRole, assigned: boolean) => {
    try {
      if (assigned) {
        await assignMutation.mutateAsync({ roleId: role.id, userId: member.userId })
      } else {
        await removeMutation.mutateAsync({ roleId: role.id, userId: member.userId })
      }
    } catch (err: any) {
      showToast?.(err?.message || 'No se pudo actualizar el rol del miembro.', 'error')
    }
  }

  const renderMember = ({ item: member }: { item: ServerMember }) => {
    const name = member.nickname || describeUser(member.userId).name
    const isOwner = member.userId === ownerId
    const isExpanded = expandedMemberId === member.id
    const memberRoles = member.roleIds
      .map(roleId => rolesById.get(roleId))
      .filter((role): role is ServerRole => Boolean(role))
      .sort((a, b) => a.position - b.position)

    return (
      <View style={styles.memberCard}>
        <Pressable
          style={styles.memberRow}
          onPress={() => setExpandedMemberId(isExpanded ? null : member.id)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.memberInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName} numberOfLines={1}>
                {name}
              </Text>
              {isOwner && <Crown color={colors.warning ?? '#faa81a'} size={14} />}
            </View>
            <View style={styles.chipRow}>
              {memberRoles.map(role => (
                <View key={role.id} style={styles.chip}>
                  <View style={[styles.chipDot, { backgroundColor: role.color || colors.textMuted }]} />
                  <Text style={styles.chipText}>{role.name}</Text>
                </View>
              ))}
            </View>
          </View>
          {isExpanded ? (
            <ChevronDown color={colors.textDim} size={16} />
          ) : (
            <ChevronRight color={colors.textDim} size={16} />
          )}
        </Pressable>

        {isExpanded && (
          <View style={styles.rolePanel}>
            {assignableRoles.length === 0 ? (
              <Text style={styles.emptyText}>Este servidor no tiene roles para asignar.</Text>
            ) : (
              assignableRoles.map(role => (
                <View key={role.id} style={styles.roleToggleRow}>
                  <View style={styles.roleToggleInfo}>
                    <View style={[styles.chipDot, { backgroundColor: role.color || colors.textMuted }]} />
                    <Text style={styles.roleToggleName} numberOfLines={1}>
                      {role.name}
                    </Text>
                  </View>
                  <Switch
                    value={member.roleIds.includes(role.id)}
                    onValueChange={value => handleToggleRole(member, role, value)}
                    disabled={isMutating}
                    trackColor={{ false: colors.border, true: colors.accent }}
                  />
                </View>
              ))
            )}
          </View>
        )}
      </View>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Users color={colors.text} size={18} />
              <Text style={styles.title}>
                Miembros{membersQuery.data ? ` — ${total}` : ''}
              </Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          {membersQuery.isLoading && (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.accent} />
            </View>
          )}

          {membersQuery.isError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {(membersQuery.error as any)?.message || 'No se pudieron cargar los miembros.'}
              </Text>
              <Pressable onPress={() => membersQuery.refetch()}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          )}

          {membersQuery.isSuccess && (
            <FlatList
              data={members}
              keyExtractor={member => member.id}
              renderItem={renderMember}
              style={styles.list}
              contentContainerStyle={{ paddingVertical: spacing.xs }}
              onEndReached={() => {
                if (membersQuery.hasNextPage && !membersQuery.isFetchingNextPage) {
                  membersQuery.fetchNextPage()
                }
              }}
              onEndReachedThreshold={0.4}
              ListEmptyComponent={<Text style={styles.emptyText}>Este servidor no tiene miembros.</Text>}
              ListFooterComponent={
                membersQuery.isFetchingNextPage ? (
                  <ActivityIndicator color={colors.accent} style={{ paddingVertical: spacing.md }} />
                ) : null
              }
            />
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.pageTitle,
    color: colors.text,
    fontSize: 18,
  },
  closeButton: {
    padding: spacing.xs,
  },
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
  memberCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.button,
    color: colors.accentFg,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberName: {
    ...typography.messageText,
    color: colors.text,
    flexShrink: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    ...typography.metadata,
    color: colors.textMuted,
    fontSize: 11,
  },
  rolePanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  roleToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  roleToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  roleToggleName: {
    ...typography.messageText,
    color: colors.text,
    flexShrink: 1,
  },
  emptyText: {
    ...typography.helperText,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
})
