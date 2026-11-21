import React, { useEffect, useState } from 'react'
import { Image, View } from 'react-native'
import {
  canSeeSettingsSection,
  memberActionsIn,
  serverBannerErrorMessage,
  serverIconErrorMessage,
  useRolesAdmin,
  useServerBansAdmin,
  useServerMembersAdmin,
} from '@discordia/core'
import { useData, useUI } from '../../../providers/AppProviders'
import { makeStyles } from '../../../theme'
import { ActionLink, ServerIcon, ServerStrip, Text, UnderlineInput } from '../../../ui'
import { pickBannerImage, pickSquareImage, toUploadFile } from '../../../utils/images'
import ConfirmModal from '../../shared/ConfirmModal'
import type { Server } from '../../../types'
import { SettingsCell, SettingsScreen, type SettingsSection } from '../SettingsScreen'
import { RoleSaveBar, RolesSection } from './RolesSection'
import { BansSection, MembersSection } from './MembersSection'
import { AuditSection } from './AuditSection'
import { MemberGrowthChart } from '../../servers/MemberGrowthChart'
import { ServerActivityMetrics } from '../../servers/ServerActivityMetrics'

export type ServerSettingsSection = 'overview' | 'roles' | 'members' | 'bans' | 'audit'
type Section = ServerSettingsSection

// Las secciones que tienen backend: canales se maneja desde la barra de canales, y moderación,
// notificaciones, emojis y mejoras todavía no se guardan (en la web, "próximamente")
const SECTIONS: SettingsSection<Section>[] = [
  { id: 'overview', label: 'Resumen' },
  { id: 'roles', label: 'Roles' },
  { id: 'members', label: 'Miembros' },
  { id: 'bans', label: 'Baneos' },
  { id: 'audit', label: 'Auditoría' },
]

/** Secciones en orden: "Ajustes del servidor" abre la primera que el usuario puede ver. */
export const SERVER_SETTINGS_SECTIONS: ServerSettingsSection[] = SECTIONS.map(section => section.id)

interface ServerSettingsScreenProps {
  visible: boolean
  /** Sección con la que abre (los atajos del menú del servidor). */
  initialSection?: Section
  server: Server
  currentUserId: string
  onClose: () => void
  /** Sin permiso para invitar, no se pasa y no aparece. */
  onInvite?: () => void
  /** ELIMINAR (si es tuyo) o ABANDONAR en el menú: abren la confirmación de la app. */
  onDeleteServer?: () => void
  onLeaveServer?: () => void
  /** Tocar a un miembro: abre su perfil público. */
  onOpenProfile?: (userId: string) => void
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
export function ServerSettingsScreen({ visible, initialSection = 'overview', server, currentUserId, onClose, onInvite, onDeleteServer, onLeaveServer, onOpenProfile }: ServerSettingsScreenProps) {
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
  // Solo las secciones y acciones que el usuario puede usar (el backend las vuelve a chequear)
  const sections = SECTIONS.filter(sec => canSeeSettingsSection(server, currentUserId, sec.id))
  const memberActions = memberActionsIn(server, currentUserId)

  const actions = [
    ...(onInvite ? [{ label: 'Invitar', onPress: onInvite }] : []),
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
      sections={sections}
      active={section}
      onSelect={setSection}
      actions={actions}
      onClose={onClose}
      footer={section === 'roles' ? <RoleSaveBar roles={roles} /> : null}
    >
      {section === 'overview' && (
        <>
          <IconCell server={server} index={0} />
          <BannerCell server={server} index={1} />
          {/* Sin PATCH /servers/{id} en el backend: nombre y descripción todavía no se guardan */}
          <SettingsCell title="Nombre y descripción" soon index={2}>
            <UnderlineInput label="nombre" value={server.name} disabled />
            <UnderlineInput label="descripción" value={server.description ?? ''} placeholder="de qué se trata" disabled />
          </SettingsCell>
          <SettingsCell title="Números" index={3}>
            <View style={styles.numbers}>
              <Figure label="miembros" value={members.total || server.memberCount || 0} />
              <Figure label="canales" value={channels.length} />
              <Figure label="roles" value={roles.roles.length} />
            </View>
          </SettingsCell>
          <SettingsCell title="Actividad del servidor" index={4}>
            <ServerActivityMetrics serverId={server.id} serverName={server.name} />
          </SettingsCell>
          <SettingsCell title="Crecimiento de miembros" index={5}>
            <MemberGrowthChart serverId={server.id} />
          </SettingsCell>
        </>
      )}

      {section === 'roles' && <RolesSection roles={roles} serverId={serverId} channels={channels} onConfirm={(copy, action) => setPending({ ...copy, action })} />}

      {section === 'members' && <MembersSection members={members} ownerId={server.ownerId} currentUserId={currentUserId} actions={memberActions} onOpenProfile={onOpenProfile} />}

      {section === 'bans' && <BansSection bans={bans} />}

      {section === 'audit' && <AuditSection serverId={server.id} />}

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

/**
 * Ícono del servidor: se guarda apenas se elige (PUT /servers/{id}/icon; dueño o Gestionar servidor) y se
 * muestra el que devuelve la API. Si falla, el error queda abajo y el ícono como estaba.
 */
function IconCell({ server, index }: { server: Server; index: number }) {
  const styles = useStyles()
  const { setServerIcon } = useData()
  const { showToast } = useUI()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const iconUrl = server.iconUrl || null

  const run = async (icon: Parameters<typeof setServerIcon>[1], done: string) => {
    setBusy(true)
    setError(null)
    try {
      await setServerIcon(server.id, icon)
      showToast(done, 'success')
    } catch (err) {
      setError(serverIconErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const pick = async () => {
    const picked = await pickSquareImage('icono')
    if (!picked) return
    if ('error' in picked) {
      setError(picked.error)
      return
    }
    await run(await toUploadFile(picked.image), 'Ícono actualizado')
  }

  return (
    <SettingsCell title="Ícono" index={index}>
      <View style={styles.iconRow}>
        <ServerIcon server={server} size="lg" label={server.name} />
        <ActionLink onPress={pick} disabled={busy}>
          {busy ? 'subiendo…' : 'cambiar ícono'}
        </ActionLink>
        {iconUrl && (
          <ActionLink onPress={() => run(null, 'Ícono quitado')} disabled={busy}>
            quitar ícono
          </ActionLink>
        )}
      </View>
      <Text variant="meta" tone={error ? 'default' : 'muted'} bold={!!error}>
        / {error ?? 'JPEG, PNG o WebP, hasta 5 MB. Se guarda al elegirlo.'}
      </Text>
    </SettingsCell>
  )
}

/**
 * Banner del servidor: el fondo de su franja en la tira (el ícono va encima). Mismo flujo que el ícono: se
 * guarda apenas se elige (PUT /servers/{id}/banner) y Server-Roles lo recorta al centro en 16:9.
 */
function BannerCell({ server, index }: { server: Server; index: number }) {
  const styles = useStyles()
  const { setServerBanner } = useData()
  const { showToast } = useUI()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const banner = server.banner || null

  const run = async (file: Parameters<typeof setServerBanner>[1], done: string) => {
    setBusy(true)
    setError(null)
    try {
      await setServerBanner(server.id, file)
      showToast(done, 'success')
    } catch (err) {
      setError(serverBannerErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const pick = async () => {
    const picked = await pickBannerImage('banner')
    if (!picked) return
    if ('error' in picked) {
      setError(picked.error)
      return
    }
    await run(await toUploadFile(picked.image), 'Banner actualizado')
  }

  return (
    <SettingsCell title="Banner" index={index}>
      <View style={styles.bannerPreview}>
        {banner ? (
          <Image source={{ uri: banner }} style={styles.bannerImage} accessibilityRole="image" accessibilityLabel={`Banner de ${server.name}`} />
        ) : (
          <Text variant="meta" tone="muted">
            sin banner
          </Text>
        )}
      </View>
      <View style={styles.iconRow}>
        {/* Cómo queda en la tira de servidores */}
        <ServerStrip server={server} />
        <ActionLink onPress={pick} disabled={busy}>
          {busy ? 'subiendo…' : 'cambiar banner'}
        </ActionLink>
        {banner && (
          <ActionLink onPress={() => run(null, 'Banner quitado')} disabled={busy}>
            quitar banner
          </ActionLink>
        )}
      </View>
      <Text variant="meta" tone={error ? 'default' : 'muted'} bold={!!error}>
        / {error ?? 'JPEG, PNG o WebP, hasta 5 MB. Se guarda al elegirlo y se recorta al centro en 16:9.'}
      </Text>
    </SettingsCell>
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
  iconRow: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: t.space[3] },
  bannerPreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.line,
  },
  bannerImage: { width: '100%', height: '100%' },
  numbers: { flexDirection: 'row', gap: t.space[6] },
  number: { gap: 2 },
}))
