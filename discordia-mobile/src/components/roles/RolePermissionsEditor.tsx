import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../../theme'
import { useUI } from '../../providers/AppProviders'
import {
  useRoleMembersQuery,
  useSetDefaultRoleMutation,
  useUpdateRoleInfoMutation,
  useUpdateRolePermissionsMutation,
} from '../../hooks/useRoles'
import type { ServerRole } from '../../types'
import { PERMISSION_CATEGORIES, hasPermission, togglePermission } from './permissions'
import { PRESET_ROLE_COLORS } from './roleColors'

interface RolePermissionsEditorProps {
  serverId: string
  role: ServerRole
  onBack: () => void
}

export default function RolePermissionsEditor({ serverId, role, onBack }: RolePermissionsEditorProps) {
  const { showToast } = useUI()
  const updatePermissionsMutation = useUpdateRolePermissionsMutation(serverId)
  const updateInfoMutation = useUpdateRoleInfoMutation(serverId)
  const setDefaultMutation = useSetDefaultRoleMutation(serverId)
  const membersQuery = useRoleMembersQuery(serverId, role.id)

  const [draft, setDraft] = useState(role.permissionsBitmask)
  const [nameDraft, setNameDraft] = useState(role.name)
  const [colorDraft, setColorDraft] = useState(role.color)
  const [error, setError] = useState<string | null>(null)

  const permissionsChanged = draft !== role.permissionsBitmask
  const nameChanged = nameDraft.trim() !== role.name
  const colorChanged = colorDraft !== role.color
  const hasChanges = permissionsChanged || nameChanged || colorChanged
  const isNameInvalid = nameChanged && nameDraft.trim().length === 0
  const isSaving = updatePermissionsMutation.isPending || updateInfoMutation.isPending

  const handleToggle = (bit: number) => {
    setError(null)
    setDraft(current => togglePermission(current, bit))
  }

  const handleDiscard = () => {
    setError(null)
    setDraft(role.permissionsBitmask)
    setNameDraft(role.name)
    setColorDraft(role.color)
  }

  const handleSave = async () => {
    setError(null)
    try {
      if (nameChanged || colorChanged) {
        await updateInfoMutation.mutateAsync({
          roleId: role.id,
          payload: {
            ...(nameChanged && { name: nameDraft }),
            ...(colorChanged && colorDraft && { color: colorDraft }),
          },
        })
      }
      if (permissionsChanged) {
        await updatePermissionsMutation.mutateAsync({ roleId: role.id, permissionsBitmask: draft })
      }
      showToast?.('Cambios del rol guardados.', 'success')
    } catch (err: any) {
      setError(err?.message || 'No se pudieron guardar los cambios del rol.')
    }
  }

  const handleSetDefault = () => {
    Alert.alert(
      'Rol por defecto',
      `¿Querés que "${role.name}" sea el rol por defecto? Los nuevos miembros lo recibirán automáticamente y el rol por defecto actual dejará de serlo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await setDefaultMutation.mutateAsync(role.id)
              showToast?.(`"${role.name}" es ahora el rol por defecto.`, 'success')
            } catch (err: any) {
              showToast?.(err?.message || 'No se pudo definir el rol por defecto.', 'error')
            }
          },
        },
      ],
    )
  }

  const handleBack = () => {
    if (!hasChanges) {
      onBack()
      return
    }
    Alert.alert('Cambios sin guardar', '¿Querés descartar los cambios del rol?', [
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
        <View style={[styles.roleDot, { backgroundColor: colorDraft || colors.textMuted }]} />
        <Text style={styles.title} numberOfLines={1}>
          {role.name}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: spacing.md }}>
        <View style={styles.category}>
          <Text style={styles.categoryTitle}>Nombre y color</Text>
          <TextInput
            style={[
              styles.nameInput,
              isNameInvalid && styles.nameInputInvalid,
              role.isDefault && styles.nameInputDisabled,
            ]}
            value={nameDraft}
            onChangeText={text => {
              setError(null)
              setNameDraft(text)
            }}
            maxLength={100}
            editable={!role.isDefault && !isSaving}
            placeholder="Nombre del rol"
            placeholderTextColor={colors.textDim}
          />
          {role.isDefault && <Text style={styles.permissionDesc}>El rol por defecto no se puede renombrar.</Text>}
          <View style={styles.swatchRow}>
            {PRESET_ROLE_COLORS.map(color => (
              <Pressable
                key={color}
                onPress={() => {
                  setError(null)
                  setColorDraft(color)
                }}
                disabled={isSaving}
                style={[
                  styles.swatch,
                  { backgroundColor: color },
                  colorDraft === color && styles.swatchSelected,
                ]}
                hitSlop={4}
              />
            ))}
          </View>
        </View>

        <View style={styles.category}>
          <Text style={styles.categoryTitle}>Rol por defecto</Text>
          {role.isDefault ? (
            <Text style={styles.permissionDesc}>
              Este es el rol por defecto: lo reciben automáticamente los nuevos miembros.
            </Text>
          ) : (
            <Pressable
              onPress={handleSetDefault}
              disabled={setDefaultMutation.isPending || isSaving}
              style={[styles.defaultButton, setDefaultMutation.isPending && styles.saveButtonDisabled]}
            >
              {setDefaultMutation.isPending ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <Text style={styles.defaultButtonText}>Usar como rol por defecto</Text>
              )}
            </Pressable>
          )}
        </View>

        <View style={styles.category}>
          <Text style={styles.categoryTitle}>
            Miembros{membersQuery.data ? ` — ${membersQuery.data.length}` : ''}
          </Text>
          {membersQuery.isLoading && <ActivityIndicator color={colors.accent} size="small" />}
          {membersQuery.isError && (
            <View>
              <Text style={styles.membersError}>
                {(membersQuery.error as any)?.message || 'No se pudieron cargar los miembros.'}
              </Text>
              <Pressable onPress={() => membersQuery.refetch()} hitSlop={8}>
                <Text style={styles.membersRetry}>Reintentar</Text>
              </Pressable>
            </View>
          )}
          {membersQuery.isSuccess && membersQuery.data.length === 0 && (
            <Text style={styles.permissionDesc}>Ningún miembro tiene este rol.</Text>
          )}
          {membersQuery.isSuccess &&
            membersQuery.data.map(member => {
              const displayName = member.nickname || member.userId
              return (
                <View key={member.id} style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { backgroundColor: colorDraft || colors.textMuted }]}>
                    <Text style={styles.memberAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.permissionInfo}>
                    <Text style={styles.permissionName} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={styles.permissionDesc}>
                      Se unió el {new Date(member.joinedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              )
            })}
        </View>

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
              disabled={isSaving || !hasChanges || isNameInvalid}
              style={[
                styles.saveButton,
                (isSaving || !hasChanges || isNameInvalid) && styles.saveButtonDisabled,
              ]}
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
  nameInput: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  nameInputInvalid: {
    borderColor: colors.danger,
  },
  nameInputDisabled: {
    opacity: 0.6,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  defaultButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultButtonText: {
    ...typography.button,
    color: colors.accent,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    ...typography.metadata,
    color: '#ffffff',
    fontWeight: '700',
  },
  membersError: {
    ...typography.metadata,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  membersRetry: {
    ...typography.button,
    color: colors.accent,
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
