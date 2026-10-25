import React, { useState } from 'react'
import { View } from 'react-native'
import { updateMyProfile, type Status } from '@discordia/core'
import { makeStyles } from '../../theme'
import { ActionLink, Choice, SquareAvatar, Text, UnderlineInput } from '../../ui'
import { useAuth, useUI } from '../../providers/AppProviders'
import type { User } from '../../types'
import { Screen } from './ShellScreen'

const PRESENCE_OPTIONS: { value: Status; label: string }[] = [
  { value: 'online', label: 'Conectado' },
  { value: 'idle', label: 'Ausente' },
  { value: 'dnd', label: 'No molestar' },
  { value: 'invisible', label: 'Invisible' },
]

const PRESENCE_LABEL: Record<Status, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  offline: 'Invisible',
  invisible: 'Invisible',
}

/** Estado que se muestra bajo el nombre: el personalizado, "En canal de voz", "reconectando" o la presencia. */
export function statusLine(user: User, inCall: boolean): string {
  if (user.customStatus) return `${user.customStatus}/`
  if (inCall) return 'En canal de voz/'
  return `${PRESENCE_LABEL[user.status] ?? 'Conectado'}/`
}

interface ProfileTabProps {
  user: User
  inCall: boolean
  onEditProfile: () => void
  onOpenSettings?: () => void
  onLogout: () => void
}

/**
 * Perfil (el menú de la barra de usuario del escritorio): quién sos, presencia (solo para esta sesión,
 * como en la web), estado personalizado (se guarda en el perfil) y los atajos.
 */
export function ProfileTab({ user, inCall, onEditProfile, onOpenSettings, onLogout }: ProfileTabProps) {
  const styles = useStyles()
  const { userProfile, updateUserProfile } = useAuth()
  const { showToast } = useUI()
  const [customStatus, setCustomStatus] = useState(user.customStatus ?? '')
  const [saving, setSaving] = useState(false)
  const presence = user.status === 'offline' ? 'invisible' : user.status
  const customChanged = customStatus.trim() !== (user.customStatus ?? '')

  // La presencia todavía no se guarda en el backend: vale para la sesión (la ven los datos locales)
  const changePresence = (status: Status) => {
    if (userProfile) updateUserProfile({ ...userProfile, activity_status: status })
  }

  const saveCustomStatus = async (value: string) => {
    setSaving(true)
    try {
      const updated = await updateMyProfile({ custom_status: value })
      if (userProfile) updateUserProfile({ ...userProfile, ...updated, custom_status: value })
      showToast(value ? 'Estado guardado' : 'Estado quitado', 'success')
    } catch {
      showToast('No se pudo guardar el estado', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen title="Mi perfil">
      <View style={styles.identity}>
        <SquareAvatar user={user} size={64} status={user.status} />
        <View style={styles.identityText}>
          <Text variant="heading" numberOfLines={1}>
            {user.displayName}
          </Text>
          <Text variant="meta" tone="muted">
            @{user.username}
          </Text>
          <Text variant="meta" tone="muted">
            {statusLine(user, inCall)}
          </Text>
        </View>
      </View>

      <View style={styles.block}>
        <Text variant="label">Estado /</Text>
        <Choice label="Estado" options={PRESENCE_OPTIONS} value={presence} onChange={changePresence} />
        <Text variant="meta" tone="muted">
          / Por ahora vale solo para esta sesión.
        </Text>
      </View>

      <View style={styles.block}>
        <UnderlineInput
          label="Estado personalizado /"
          value={customStatus}
          onChangeText={setCustomStatus}
          placeholder="¿En qué andás?"
          maxLength={128}
          returnKeyType="done"
          onSubmitEditing={() => customChanged && saveCustomStatus(customStatus.trim())}
          disabled={saving}
        />
        <View style={styles.links}>
          {customChanged ? (
            <ActionLink onPress={() => saveCustomStatus(customStatus.trim())} disabled={saving}>
              guardar
            </ActionLink>
          ) : user.customStatus ? (
            <ActionLink
              onPress={() => {
                setCustomStatus('')
                saveCustomStatus('')
              }}
              disabled={saving}
            >
              quitar
            </ActionLink>
          ) : null}
        </View>
      </View>

      <View style={[styles.block, styles.links]}>
        <ActionLink size="bodySmall" onPress={onEditProfile}>
          editar perfil
        </ActionLink>
        {onOpenSettings && (
          <ActionLink size="bodySmall" onPress={onOpenSettings}>
            ajustes
          </ActionLink>
        )}
        <ActionLink size="bodySmall" onPress={onLogout}>
          cerrar sesión
        </ActionLink>
      </View>
    </Screen>
  )
}

const useStyles = makeStyles(t => ({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[4],
    padding: t.space[5],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
  identityText: { flex: 1, gap: 2 },
  block: {
    gap: t.space[2],
    paddingVertical: t.space[5],
    paddingHorizontal: t.space[5],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: t.space[5], rowGap: t.space[2] },
}))
