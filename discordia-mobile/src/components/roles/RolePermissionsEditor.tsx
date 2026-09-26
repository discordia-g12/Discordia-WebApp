import React, { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../../theme'
import { useUI } from '../../providers/AppProviders'
import { useUpdateRolePermissionsMutation } from '../../hooks/useRoles'
import type { ServerRole } from '../../types'
import { PERMISSION_CATEGORIES, hasPermission, togglePermission } from './permissions'

interface RolePermissionsEditorProps {
  serverId: string
  role: ServerRole
  onBack: () => void
}

export default function RolePermissionsEditor({ serverId, role, onBack }: RolePermissionsEditorProps) {
  const { showToast } = useUI()
  const updateMutation = useUpdateRolePermissionsMutation(serverId)

  const [draft, setDraft] = useState(role.permissionsBitmask)
  const [error, setError] = useState<string | null>(null)

  const hasChanges = draft !== role.permissionsBitmask
  const isSaving = updateMutation.isPending

  const handleToggle = (bit: number) => {
    setError(null)
    setDraft(current => togglePermission(current, bit))
  }

  const handleDiscard = () => {
    setError(null)
    setDraft(role.permissionsBitmask)
  }

  const handleSave = async () => {
    setError(null)
    try {
      await updateMutation.mutateAsync({ roleId: role.id, permissionsBitmask: draft })
      showToast?.(`Permisos de "${role.name}" guardados.`, 'success')
    } catch (err: any) {
      setError(err?.message || 'No se pudieron guardar los permisos.')
    }
  }

  const handleBack = () => {
    if (!hasChanges) {
      onBack()
      return
    }
    Alert.alert('Cambios sin guardar', '¿Querés descartar los cambios de permisos?', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: onBack },
    ])
  }

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <ChevronLeft color={colors.text} size={20} />
        </Pressable>
        <View style={[styles.roleDot, { backgroundColor: role.color || colors.textMuted }]} />
        <Text style={styles.title} numberOfLines={1}>
          {role.name}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: spacing.md }}>
        {PERMISSION_CATEGORIES.map(category => (
          <View key={category.category} style={styles.category}>
            <Text style={styles.categoryTitle}>{category.category}</Text>
            {category.permissions.map(permission => (
              <View key={permission.bit} style={styles.permissionRow}>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>{permission.name}</Text>
                  <Text style={styles.permissionDesc}>{permission.desc}</Text>
                </View>
                <Switch
                  value={hasPermission(draft, permission.bit)}
                  onValueChange={() => handleToggle(permission.bit)}
                  disabled={isSaving}
                  trackColor={{ false: colors.border, true: colors.accent }}
                />
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {(hasChanges || error) && (
        <View style={[styles.saveBar, error ? styles.saveBarError : null]}>
          <Text style={[styles.saveBarText, error ? styles.saveBarTextError : null]}>
            {error ?? 'Tenés cambios sin guardar.'}
          </Text>
          <View style={styles.saveBarActions}>
            <Pressable onPress={handleDiscard} disabled={isSaving} style={styles.discardButton}>
              <Text style={styles.discardText}>Descartar</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={isSaving || !hasChanges}
              style={[styles.saveButton, (isSaving || !hasChanges) && styles.saveButtonDisabled]}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.accentFg} size="small" />
              ) : (
                <Text style={styles.saveText}>Guardar</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  roleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    ...typography.pageTitle,
    color: colors.text,
    fontSize: 16,
    flexShrink: 1,
  },
  scroll: {
    maxHeight: 380,
  },
  category: {
    marginBottom: spacing.md,
  },
  categoryTitle: {
    ...typography.metadata,
    color: colors.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    ...typography.messageText,
    color: colors.text,
  },
  permissionDesc: {
    ...typography.metadata,
    color: colors.textMuted,
  },
  saveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBarError: {
    borderColor: colors.danger,
  },
  saveBarText: {
    ...typography.metadata,
    color: colors.text,
    flex: 1,
  },
  saveBarTextError: {
    color: colors.danger,
  },
  saveBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  discardButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  discardText: {
    ...typography.button,
    color: colors.textMuted,
  },
  saveButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    ...typography.button,
    color: colors.accentFg,
    fontWeight: '600',
  },
})
