import React from 'react'
import { Pressable, View } from 'react-native'
import { ArrowDown, ArrowUp } from 'lucide-react-native'
import { PERMISSION_CATEGORIES, PRESET_ROLE_COLORS, hasBackendBit, type RolesAdminState } from '@discordia/core'
import { makeStyles, useTheme } from '../../../theme'
import { ActionLink, BlockButton, Skeleton, Text, UnderlineInput } from '../../../ui'
import { Feedback, SettingsCell, SettingsRow, Switch } from '../SettingsScreen'

/** Color de un rol: un cuadrado chico (el color nunca va como color de texto). */
export function RoleSwatch({ color, size = 10 }: { color?: string | null; size?: number }) {
  const styles = useStyles()
  return <View style={[styles.swatch, { width: size, height: size, backgroundColor: color || 'transparent' }]} />
}

/** Colores elegibles como cuadrados; el elegido, con un contorno. */
function ColorPicker({ value, onChange, label }: { value: string | null; onChange: (color: string) => void; label: string }) {
  const styles = useStyles()
  return (
    <View style={styles.colors} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {PRESET_ROLE_COLORS.map(color => (
        <Pressable
          key={color}
          onPress={() => onChange(color)}
          accessibilityRole="radio"
          accessibilityLabel={color}
          accessibilityState={{ checked: value === color }}
          style={[styles.colorOption, value === color && styles.colorActive]}
          hitSlop={4}
        >
          <RoleSwatch color={color} size={20} />
        </Pressable>
      ))}
    </View>
  )
}

interface RolesSectionProps {
  roles: RolesAdminState
  /** Pide confirmación antes de hacer un rol el de por defecto o borrarlo (modal de la pantalla). */
  onConfirm: (copy: { title: string; message: string; confirmLabel: string; tone: 'default' | 'danger' }, action: () => Promise<void>) => void
}

/** ROLES: crear (con color), la lista, editar el elegido (nombre, color, por defecto, borrar, miembros) y sus permisos. */
export function RolesSection({ roles: r, onConfirm }: RolesSectionProps) {
  const styles = useStyles()
  const { colors } = useTheme()
  const role = r.activeRole

  if (r.rolesQuery.isLoading) {
    return (
      <SettingsCell title="Roles">
        <Skeleton lines={4} label="Cargando roles" />
      </SettingsCell>
    )
  }

  return (
    <>
      <SettingsCell title="Crear rol" index={0}>
        <UnderlineInput
          label="nombre del rol"
          value={r.newRoleName}
          onChangeText={r.setNewRoleName}
          placeholder="ej: moderación"
          maxLength={100}
          returnKeyType="go"
          onSubmitEditing={() => r.handleCreateRole()}
        />
        <ColorPicker label="Color del rol nuevo" value={r.newRoleColor} onChange={r.setNewRoleColor} />
        {r.roleError && <Feedback tone="error">{r.roleError}</Feedback>}
        <BlockButton onPress={() => r.handleCreateRole()} loading={r.createRoleMutation.isPending} disabled={!r.newRoleName.trim()}>
          Crear
        </BlockButton>
      </SettingsCell>

      <SettingsCell title="Roles" index={1}>
        {r.roleError && <Feedback tone="error">{r.roleError}</Feedback>}
        {r.roles.length === 0 ? (
          <Text variant="meta" tone="muted">
            / Este servidor todavía no tiene roles.
          </Text>
        ) : (
          r.roles.map((item, index) => {
            const active = item.id === role?.id
            return (
              <View key={item.id} style={styles.roleRowContainer}>
                <Pressable
                  onPress={() => r.setActiveRoleId(item.id)}
                  style={[styles.roleRow, styles.flex]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  {active && <View style={styles.activeBar} />}
                  <RoleSwatch color={item.color} />
                  <Text variant="bodySmall" bold={active} style={styles.flex} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.isDefault && (
                    <Text variant="meta" tone="muted">
                      por defecto/
                    </Text>
                  )}
                </Pressable>
                <View style={styles.shiftButtons}>
                  <Pressable
                    style={[styles.iconButton, (index === 0 || r.reorderRolesMutation.isPending) && styles.disabledButton]}
                    onPress={() => r.handleMoveRole(item.id, -1)}
                    disabled={index === 0 || r.reorderRolesMutation.isPending}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Subir ${item.name}`}
                  >
                    <ArrowUp color={index === 0 ? colors.textMuted : colors.text} size={16} strokeWidth={1.5} />
                  </Pressable>
                  <Pressable
                    style={[
                      styles.iconButton,
                      (index === r.roles.length - 1 || r.reorderRolesMutation.isPending) && styles.disabledButton,
                    ]}
                    onPress={() => r.handleMoveRole(item.id, 1)}
                    disabled={index === r.roles.length - 1 || r.reorderRolesMutation.isPending}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Bajar ${item.name}`}
                  >
                    <ArrowDown
                      color={index === r.roles.length - 1 ? colors.textMuted : colors.text}
                      size={16}
                      strokeWidth={1.5}
                    />
                  </Pressable>
                </View>
              </View>
            )
          })
        )}
      </SettingsCell>

      {role && (
        <SettingsCell title={`Editar ${role.name}`} index={2}>
          <UnderlineInput
            label="nombre"
            value={r.activeName}
            onChangeText={name => r.handleChangeRoleInfo(role, { name })}
            maxLength={100}
            error={r.isRoleNameInvalid ? 'El nombre no puede quedar vacío.' : undefined}
          />
          <ColorPicker label={`Color de ${role.name}`} value={r.activeColor} onChange={color => r.handleChangeRoleInfo(role, { color })} />
          <View style={styles.links}>
            {!role.isDefault && (
              <ActionLink
                onPress={() =>
                  onConfirm(
                    {
                      title: '¿Rol por defecto?',
                      message: `Los miembros nuevos van a recibir ${role.name} automáticamente, y el rol por defecto actual deja de serlo.`,
                      confirmLabel: 'Hacer por defecto',
                      tone: 'default',
                    },
                    () => r.handleSetDefaultRole(role),
                  )
                }
              >
                hacer por defecto
              </ActionLink>
            )}
            {!role.isDefault && (
              <ActionLink
                onPress={() =>
                  onConfirm(
                    {
                      title: '¿Eliminar rol?',
                      message: `Se borra ${role.name}. Los miembros que lo tengan pierden sus permisos.`,
                      confirmLabel: 'Eliminar',
                      tone: 'danger',
                    },
                    () => r.handleDeleteRole(role),
                  )
                }
              >
                eliminar
              </ActionLink>
            )}
            <ActionLink onPress={() => r.setMembersExpandedRoleId(r.isMembersExpanded ? null : role.id)}>
              {r.isMembersExpanded ? 'ocultar miembros' : 'ver miembros'}
            </ActionLink>
          </View>
          {r.isMembersExpanded &&
            (r.roleMembersQuery.isLoading ? (
              <Skeleton lines={2} label="Cargando miembros del rol" />
            ) : (r.roleMembersQuery.data ?? []).length === 0 ? (
              <Text variant="meta" tone="muted">
                / Nadie tiene este rol.
              </Text>
            ) : (
              (r.roleMembersQuery.data ?? []).map(member => (
                <Text key={member.id} variant="bodySmall">
                  {member.nickname || r.roleMemberProfiles[member.userId]?.displayName || 'Usuario'}
                </Text>
              ))
            ))}
        </SettingsCell>
      )}

      {role &&
        PERMISSION_CATEGORIES.map((category, i) => (
          <SettingsCell key={category.category} title={category.category} index={3 + i}>
            {category.permissions.map(permission => {
              const saved = hasBackendBit(permission.id)
              return (
                <SettingsRow key={permission.id} title={permission.name} description={saved ? permission.desc : `${permission.desc} (próximamente)`}>
                  <Switch
                    label={permission.name}
                    checked={r.activePermissions.includes(permission.id)}
                    onChange={() => r.handleTogglePermission(role, permission.id)}
                    disabled={!saved}
                  />
                </SettingsRow>
              )
            })}
          </SettingsCell>
        ))}
    </>
  )
}

/** Barra negra de cambios sin guardar del rol elegido: _descartar y GUARDAR. Va fija al pie de la pantalla. */
export function RoleSaveBar({ roles: r }: { roles: RolesAdminState }) {
  const styles = useStyles()
  const role = r.activeRole
  if (!role || !r.hasUnsavedRole) return null
  return (
    <View style={styles.saveBar} accessibilityLiveRegion="polite">
      <View style={styles.flex}>
        <Text variant="bodySmall" tone="inverse">
          cambios sin guardar/
        </Text>
        {r.roleEditError && (
          <Text variant="meta" tone="inverse" bold>
            / {r.roleEditError}
          </Text>
        )}
      </View>
      <ActionLink tone="inverse" onPress={() => r.discardRoleDrafts(role.id)} disabled={r.isSavingRole}>
        descartar
      </ActionLink>
      <Pressable
        onPress={() => r.handleSaveRole(role)}
        disabled={r.isSavingRole || r.isRoleNameInvalid}
        accessibilityRole="button"
        accessibilityLabel="Guardar los cambios del rol"
        style={styles.saveButton}
      >
        <Text variant="bodySmall" tone="inverse" bold>
          {r.isSavingRole ? 'GUARDANDO /' : 'GUARDAR /'}
        </Text>
      </Pressable>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  swatch: { borderWidth: t.lines.hairline, borderColor: t.colors.line },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  colorOption: { padding: 3, borderWidth: t.lines.focus, borderColor: 'transparent' },
  colorActive: { borderColor: t.colors.lineStrong },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], minHeight: 36, paddingLeft: t.space[3] },
  roleRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
  shiftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    paddingRight: t.space[2],
  },
  iconButton: {
    padding: t.space[1],
  },
  disabledButton: {
    opacity: 0.3,
  },
  activeBar: { position: 'absolute', left: 0, top: 6, bottom: 6, width: t.lines.accent, backgroundColor: t.colors.inverseBackground },
  flex: { flex: 1 },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: t.space[5], rowGap: t.space[2] },
  saveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[4],
    paddingVertical: t.space[3],
    paddingLeft: t.space[5],
    backgroundColor: t.colors.inverseBackground,
  },
  saveButton: { paddingVertical: t.space[2], paddingHorizontal: t.space[5], borderLeftWidth: t.lines.hairline, borderLeftColor: t.colors.inverseText },
}))
