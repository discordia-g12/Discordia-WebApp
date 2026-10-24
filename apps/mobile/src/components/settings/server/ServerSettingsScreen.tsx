import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useRolesAdmin, useServerBansAdmin, useServerMembersAdmin } from '@discordia/core'
import { makeStyles } from '../../../theme'
import { ServerStrip, Text, UnderlineInput } from '../../../ui'
import ConfirmModal from '../../shared/ConfirmModal'
import type { Server } from '../../../types'
import { SettingsCell, SettingsScreen, type SettingsSection } from '../SettingsScreen'
import { RoleSaveBar, RolesSection } from './RolesSection'
import { BansSection, MembersSection } from './MembersSection'

export type ServerSettingsSection = 'overview' | 'roles' | 'members' | 'bans'
type Section = ServerSettingsSection

// Las secciones que tienen backend: canales se maneja desde la barra de canales, y moderación,
// notificaciones, emojis y mejoras todavía no se guardan (en la web, "próximamente")
const SECTIONS: SettingsSection<Section>[] = [
  { id: 'overview', label: 'Resumen' },
  { id: 'roles', label: 'Roles' },
  { id: 'members', label: 'Miembros' },
  { id: 'bans', label: 'Baneos' },
]

interface ServerSettingsScreenProps {
  visible: boolean
  /** Sección con la que abre (los atajos del menú del servidor). */
  initialSection?: Section
  server: Server
  currentUserId: string
  onClose: () => void
  onInvite: () => void
  /** ELIMINAR (si es tuyo) o ABANDONAR en el menú: abren la confirmación de la app. */
  onDeleteServer?: () => void
  onLeaveServer?: () => void
}

type PendingConfirm = {
  title: string
  message: string
  confirmLabel: string
  tone: 'default' | 'danger'
  action: () => Promise<void>
}

/**
 * Ajustes del servidor, como los de la web (paso 9b) en pantalla chica: RESUMEN, ROLES, MIEMBROS y
 * BANEOS, con INVITAR y ELIMINAR / ABANDONAR en el menú. El estado y las reglas de roles, miembros y
 * baneos son de core (useRolesAdmin, useServerMembersAdmin, useServerBansAdmin), los mismos que la web.
 */
export function ServerSettingsScreen({ visible, initialSection = 'overview', server, currentUserId, onClose, onInvite, onDeleteServer, onLeaveServer }: ServerSettingsScreenProps) {
  const styles = useStyles()
  const [section, setSection] = useState<Section>('overview')
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  useEffect(() => {
    if (visible) setSection(initialSection)
  }, [visible, initialSection])
  // Sin id, las consultas no salen: solo se piden con la pantalla abierta
  const serverId = visible ? server.id : ''
  const roles = useRolesAdmin(serverId)
  const members = useServerMembersAdmin(serverId)
  const bans = useServerBansAdmin(serverId)
  const isOwner = server.ownerId === currentUserId
  const channels = server.categories.flatMap(c => c.channels)

  const actions = [
    { label: 'Invitar', onPress: onInvite },
    ...(isOwner && onDeleteServer ? [{ label: 'Eliminar', onPress: onDeleteServer }] : []),
    ...(!isOwner && onLeaveServer ? [{ label: 'Abandonar', onPress: onLeaveServer }] : []),
  ]

  return (
    <SettingsScreen
      visible={visible}
      title={`Ajustes de ${server.name}`}
      identity={
        <View style={styles.identity}>
          <ServerStrip server={server} />
          <View style={styles.flex}>
            <Text variant="bodySmall" bold numberOfLines={1}>
              {server.name}
            </Text>
            <Text variant="meta" tone="muted">
              ajustes del servidor/
            </Text>
          </View>
        </View>
      }
      sections={SECTIONS}
      active={section}
      onSelect={setSection}
      actions={actions}
      onClose={onClose}
      footer={section === 'roles' ? <RoleSaveBar roles={roles} /> : null}
    >
      {section === 'overview' && (
        <>
          <SettingsCell title="Identidad del servidor" soon index={0}>
            <UnderlineInput label="nombre" value={server.name} disabled />
            <UnderlineInput label="descripción" value={server.description ?? ''} placeholder="de qué se trata" disabled />
          </SettingsCell>
          <SettingsCell title="Números" index={1}>
            <View style={styles.numbers}>
              <Figure label="miembros" value={members.total || server.memberCount || 0} />
              <Figure label="canales" value={channels.length} />
              <Figure label="roles" value={roles.roles.length} />
            </View>
          </SettingsCell>
        </>
      )}

      {section === 'roles' && <RolesSection roles={roles} onConfirm={(copy, action) => setPending({ ...copy, action })} />}

      {section === 'members' && <MembersSection members={members} ownerId={server.ownerId} currentUserId={currentUserId} />}

      {section === 'bans' && <BansSection bans={bans} />}

      <ConfirmModal
        visible={!!pending}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmLabel={pending?.confirmLabel ?? ''}
        tone={pending?.tone}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          await pending?.action()
          setPending(null)
        }}
      />
    </SettingsScreen>
  )
}

function Figure({ label, value }: { label: string; value: number }) {
  const styles = useStyles()
  return (
    <View style={styles.number}>
      <Text variant="heading">{value}</Text>
      <Text variant="meta" tone="muted">
        {label}/
      </Text>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  identity: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  flex: { flex: 1 },
  numbers: { flexDirection: 'row', gap: t.space[6] },
  number: { gap: 2 },
}))
