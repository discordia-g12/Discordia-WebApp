import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { ChevronDown, ChevronRight, Crown, UserX, Users, X } from 'lucide-react-native'
import { BAN_REASON_MAX_LENGTH, banErrorMessage } from '@discordia/core'
import { colors, radii, spacing, typography } from '../../theme'
import { useUI } from '../../providers/AppProviders'
import { useAssignRoleMutation, useRemoveRoleMutation, useRolesQuery } from '../../hooks/useRoles'
import { useServerMembersQuery } from '../../hooks/useServerMembers'
import { useBanMemberMutation } from '../../hooks/useModeration'
import { useUserDisplay } from '../../hooks/useUserProfiles'
import type { ServerMember, ServerRole } from '../../types'
import BansList from './BansList'

interface MembersModalProps {
  visible: boolean
  serverId: string | null
  ownerId: string | null
  currentUserId: string
  onClose: () => void
}

type MembersTab = 'members' | 'bans'

export default function MembersModal({ visible, serverId, ownerId, currentUserId, onClose }: MembersModalProps) {
  const { showToast } = useUI()
  const membersQuery = useServerMembersQuery(visible ? serverId : null)
  const rolesQuery = useRolesQuery(visible ? serverId : null)
  const assignMutation = useAssignRoleMutation(serverId as string)
  const removeMutation = useRemoveRoleMutation(serverId as string)
  const banMutation = useBanMemberMutation(serverId as string)

  const [tab, setTab] = useState<MembersTab>('members')
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
  const [banReason, setBanReason] = useState('')

  const members: ServerMember[] = useMemo(
    () => membersQuery.data?.pages.flatMap(page => page.items) ?? [],
    [membersQuery.data],
  )
  const total = membersQuery.data?.pages[0]?.total ?? 0
  const describeUser = useUserDisplay(members.map(member => member.userId))
  const roles: ServerRole[] = rolesQuery.data ?? []
  const rolesById = useMemo(() => new Map(roles.map(role => [role.id, role])), [roles])
  const assignableRoles = roles.filter(role => !role.isDefault)
  const isMutating = assignMutation.isPending || removeMutation.isPending || banMutation.isPending

  const handleClose = () => {
    setTab('members')
    setExpandedMemberId(null)
    setBanReason('')
    onClose()
  }

  const handleToggleExpanded = (member: ServerMember) => {
    setBanReason('')
    setExpandedMemberId(expandedMemberId === member.id ? null : member.id)
  }

  const handleBan = (member: ServerMember, name: string) => {
    Alert.alert(
      'Banear miembro',
      `¿Seguro que querés banear a ${name}? Va a salir del servidor y no podrá volver a unirse hasta que se revoque el baneo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Banear',
          style: 'destructive',
          onPress: async () => {
            try {
              await banMutation.mutateAsync({ userId: member.userId, reason: banReason })
              setExpandedMemberId(null)
              setBanReason('')
              showToast?.(`${name} fue baneado del servidor.`, 'success')
            } catch (err) {
              showToast?.(banErrorMessage(err), 'error')
            }
          },
        },
      ],
    )
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
    // El backend también lo rechaza; se oculta para no ofrecer una acción imposible
    const canShowBan = !isOwner && member.userId !== currentUserId
    const memberRoles = member.roleIds
      .map(roleId => rolesById.get(roleId))
      .filter((role): role is ServerRole => Boolean(role))
      .sort((a, b) => a.position - b.position)

    return (
      <View style={styles.memberCard}>
        <Pressable
          style={styles.memberRow}
          onPress={() => handleToggleExpanded(member)}
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

            {canShowBan && (
              <View style={styles.banSection}>
                <TextInput
                  value={banReason}
                  onChangeText={setBanReason}
                  maxLength={BAN_REASON_MAX_LENGTH}
                  placeholder="Motivo del baneo (opcional)"
                  placeholderTextColor={colors.textMuted}
                  style={styles.banInput}
                />
                <Pressable
                  style={styles.banButton}
                  onPress={() => handleBan(member, name)}
                  disabled={isMutating}
                >
                  <UserX color={colors.accentFg} size={14} />
                  <Text style={styles.banButtonText}>Banear</Text>
                </Pressable>
              </View>
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

          <View style={styles.tabs}>
            {(
              [
                { id: 'members', label: 'Miembros' },
                { id: 'bans', label: 'Baneos' },
              ] as const
            ).map(item => (
              <Pressable
                key={item.id}
                style={[styles.tab, tab === item.id && styles.tabActive]}
                onPress={() => setTab(item.id)}
              >
                <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          {tab === 'bans' && <BansList serverId={visible ? serverId : null} />}

          {tab === 'members' && membersQuery.isLoading && (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.accent} />
            </View>
          )}

          {tab === 'members' && membersQuery.isError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {(membersQuery.error as any)?.message || 'No se pudieron cargar los miembros.'}
              </Text>
              <Pressable onPress={() => membersQuery.refetch()}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          )}

          {tab === 'members' && membersQuery.isSuccess && (
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
  tabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.bg,
  },
  tabActive: {
    backgroundColor: colors.surfaceHover,
  },
  tabText: {
    ...typography.button,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
  },
  banSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  banInput: {
    ...typography.messageText,
    flex: 1,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  banButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.danger,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  banButtonText: {
    ...typography.button,
    color: colors.accentFg,
  },
  emptyText: {
    ...typography.helperText,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
})
