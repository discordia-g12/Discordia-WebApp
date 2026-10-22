import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { ChevronRight, Shield, Trash2, X } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../../theme'
import { useUI } from '../../providers/AppProviders'
import { useCreateRoleMutation, useDeleteRoleMutation, useRolesQuery } from '../../hooks/useRoles'
import type { ServerRole } from '../../types'
import RolePermissionsEditor from './RolePermissionsEditor'
import { PRESET_ROLE_COLORS } from './roleColors'

interface RolesModalProps {
  visible: boolean
  serverId: string | null
  onClose: () => void
}

export default function RolesModal({ visible, serverId, onClose }: RolesModalProps) {
  const { showToast } = useUI()
  const rolesQuery = useRolesQuery(serverId)
  const createRoleMutation = useCreateRoleMutation(serverId as string)
  const deleteRoleMutation = useDeleteRoleMutation(serverId as string)

  const [newRoleName, setNewRoleName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)

  const editingRole = rolesQuery.data?.find(r => r.id === editingRoleId) ?? null

  const handleClose = () => {
    setEditingRoleId(null)
    onClose()
  }

  const handleCreate = async () => {
    const trimmed = newRoleName.trim()
    if (!trimmed) return

    try {
      await createRoleMutation.mutateAsync({ name: trimmed, color: selectedColor || undefined })
      setNewRoleName('')
      setSelectedColor(null)
      showToast?.(`Rol "${trimmed}" creado con éxito.`, 'success')
    } catch (err: any) {
      showToast?.(err?.message || 'Error al crear el rol. Intentá de nuevo.', 'error')
    }
  }

  const handleDelete = (role: ServerRole) => {
    Alert.alert(
      'Eliminar rol',
      `¿Seguro que querés eliminar el rol "${role.name}"? Los miembros que lo tienen van a perder los permisos asociados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoleMutation.mutateAsync(role.id)
              showToast?.(`Rol "${role.name}" eliminado.`, 'success')
            } catch (err: any) {
              showToast?.(err?.message || 'Error al eliminar el rol.', 'error')
            }
          },
        },
      ],
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Shield color={colors.text} size={18} />
              <Text style={styles.title}>Roles del servidor</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          {editingRole && serverId && (
            <RolePermissionsEditor
              key={editingRole.id}
              serverId={serverId}
              role={editingRole}
              onBack={() => setEditingRoleId(null)}
            />
          )}

          {!editingRole && rolesQuery.isLoading && (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.accent} />
            </View>
          )}

          {!editingRole && rolesQuery.isError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {(rolesQuery.error as any)?.message || 'No se pudieron cargar los roles.'}
              </Text>
              <Pressable onPress={() => rolesQuery.refetch()} style={styles.retryButton}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          )}

          {!editingRole && rolesQuery.isSuccess && (
            <FlatList
              data={rolesQuery.data}
              keyExtractor={r => r.id}
              style={styles.list}
              contentContainerStyle={{ paddingVertical: spacing.xs }}
              renderItem={({ item: role }) => (
                <View style={styles.roleRow}>
                  <Pressable style={styles.roleInfo} onPress={() => setEditingRoleId(role.id)}>
                    <View style={[styles.roleDot, { backgroundColor: role.color || colors.textMuted }]} />
                    <Text style={styles.roleName} numberOfLines={1}>
                      {role.name}
                    </Text>
                    {role.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>por defecto</Text>
                      </View>
                    )}
                    <ChevronRight color={colors.textDim} size={16} />
                  </Pressable>

                  {!role.isDefault && (
                    <Pressable
                      onPress={() => handleDelete(role)}
                      disabled={deleteRoleMutation.isPending}
                      style={styles.deleteButton}
                      hitSlop={8}
                    >
                      <Trash2 color={colors.danger} size={16} />
                    </Pressable>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Este servidor todavía no tiene roles.</Text>
              }
            />
          )}

          {!editingRole && (
            <View style={styles.createSection}>
              <View style={styles.swatchRow}>
                {PRESET_ROLE_COLORS.map(color => {
                  const isSelected = selectedColor === color
                  return (
                    <Pressable
                      key={color}
                      onPress={() => setSelectedColor(isSelected ? null : color)}
                      disabled={createRoleMutation.isPending}
                      style={[
                        styles.swatch,
                        { backgroundColor: color },
                        isSelected && styles.swatchSelected,
                      ]}
                      hitSlop={4}
                    />
                  )
                })}
              </View>

              <View style={styles.createRow}>
                <TextInput
                  style={styles.input}
                  value={newRoleName}
                  onChangeText={setNewRoleName}
                  placeholder="Nombre del nuevo rol"
                  placeholderTextColor={colors.textDim}
                  maxLength={100}
                  editable={!createRoleMutation.isPending}
                />
                <Pressable
                  style={[
                    styles.createButton,
                    (!newRoleName.trim() || createRoleMutation.isPending) && styles.createButtonDisabled,
                  ]}
                  onPress={handleCreate}
                  disabled={!newRoleName.trim() || createRoleMutation.isPending}
                >
                  {createRoleMutation.isPending ? (
                    <ActivityIndicator color={colors.accentFg} size="small" />
                  ) : (
                    <Text style={styles.createButtonText}>Crear</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
  retryButton: {
    alignSelf: 'flex-start',
  },
  retryText: {
    ...typography.button,
    color: colors.accent,
  },
  list: {
    maxHeight: 320,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  roleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleName: {
    ...typography.messageText,
    color: colors.text,
    flexShrink: 1,
  },
  defaultBadge: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    ...typography.metadata,
    color: colors.textMuted,
    fontSize: 10,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  emptyText: {
    ...typography.helperText,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  createSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: colors.text,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  createButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    ...typography.button,
    color: colors.accentFg,
    fontWeight: '600',
  },
})
