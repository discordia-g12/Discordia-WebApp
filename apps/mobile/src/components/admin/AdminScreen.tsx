import React, { useState } from 'react'
import { View } from 'react-native'
import {
  ACCOUNT_STATE_LABEL,
  ACCOUNT_STATE_OPTIONS,
  BACKOFFICE_SECTIONS,
  BACKOFFICE_SOON_NOTE,
  INVESTIGATION_TARGET_OPTIONS,
  SAMPLE_CASE,
  SAMPLE_PLATFORM_SERVERS,
  SAMPLE_PLATFORM_USERS,
  SUSPENSION_DURATIONS,
  filterPlatformServers,
  filterPlatformUsers,
  formatBackofficeDate,
  type AccountState,
  type AccountStateFilter,
  type BackofficeSection,
  type InvestigationTarget,
} from '@discordia/core'
import { useAuth } from '../../providers/AppProviders'
import { makeStyles } from '../../theme'
import { ActionLink, BlockButton, Choice, EmptyState, SquareAvatar, Text, UnderlineInput } from '../../ui'
import { SettingsCell, SettingsRow, SettingsScreen } from '../settings/SettingsScreen'

const SOON_NOTE = BACKOFFICE_SOON_NOTE

interface AdminScreenProps {
  visible: boolean
  onClose: () => void
}

/**
 * Backoffice de administración de la plataforma (prototipo), como el de la web en pantalla chica: USUARIOS
 * (listado con filtros, suspender y reactivar), SERVIDORES (listado, suspender y eliminar) e INVESTIGACIÓN
 * (expediente de un usuario o servidor). Solo lo abre quien tiene el rol de plataforma "staff". Sin
 * endpoints de staff todavía: todas las celdas quedan en "próximamente" y los listados muestran las filas
 * de ejemplo de core (admin/backoffice.ts).
 */
export function AdminScreen({ visible, onClose }: AdminScreenProps) {
  const styles = useStyles()
  const { userProfile } = useAuth()
  const [section, setSection] = useState<BackofficeSection>('users')
  const name = userProfile?.display_name || userProfile?.username || ''

  return (
    <SettingsScreen
      visible={visible}
      title="Administración"
      identity={
        <View style={styles.identity}>
          <SquareAvatar user={{ username: userProfile?.username ?? '', displayName: name, avatar: userProfile?.avatar_url }} size={40} />
          <View style={styles.flex}>
            <Text variant="bodySmall" bold numberOfLines={1}>
              {name}
            </Text>
            <Text variant="meta" tone="muted">
              backoffice de la plataforma/
            </Text>
          </View>
        </View>
      }
      sections={BACKOFFICE_SECTIONS}
      active={section}
      onSelect={setSection}
      onClose={onClose}
    >
      {section === 'users' && <UsersSection />}
      {section === 'servers' && <ServersSection />}
      {section === 'investigation' && <InvestigationSection />}
    </SettingsScreen>
  )
}

/** Estado de una cuenta o servidor como etiqueta con borde (suspendido, invertido). */
function StateTag({ state }: { state: AccountState }) {
  const styles = useStyles()
  const suspended = state === 'suspended'
  return (
    <View style={[styles.tag, suspended && styles.tagSuspended]}>
      <Text variant="meta" tone={suspended ? 'inverse' : 'default'}>
        {ACCOUNT_STATE_LABEL[state]}
      </Text>
    </View>
  )
}

/** Suspender (usuario o servidor): a quién, por cuánto y por qué. */
function SuspendForm({ targetLabel, placeholder }: { targetLabel: string; placeholder: string }) {
  const [target, setTarget] = useState('')
  const [duration, setDuration] = useState(SUSPENSION_DURATIONS[0])
  const [reason, setReason] = useState('')
  return (
    <>
      <UnderlineInput label={targetLabel} value={target} onChangeText={setTarget} placeholder={placeholder} autoCapitalize="none" />
      <Choice label="Duración de la suspensión" options={SUSPENSION_DURATIONS.map(d => ({ value: d, label: d }))} value={duration} onChange={setDuration} />
      <UnderlineInput label="motivo" value={reason} onChangeText={setReason} maxLength={512} hint="queda en el expediente" />
      <BlockButton tone="danger">Suspender</BlockButton>
    </>
  )
}

/** Fila de un listado: avatar, nombre con los datos debajo, estado y acciones. */
function ListRow({ title, meta, state, actions }: { title: string; meta: string; state: AccountState; actions: string[] }) {
  const styles = useStyles()
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <SquareAvatar user={{ displayName: title, username: title }} size={28} />
        <View style={styles.flex}>
          <Text variant="bodySmall" bold numberOfLines={1}>
            {title}
          </Text>
          <Text variant="meta" tone="muted">
            {meta}
          </Text>
        </View>
        <StateTag state={state} />
      </View>
      <View style={styles.links}>
        {actions.map(action => (
          <ActionLink key={action}>{action}</ActionLink>
        ))}
      </View>
    </View>
  )
}

// ==========================================
// USUARIOS
// ==========================================

function UsersSection() {
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<AccountStateFilter>('all')
  const users = filterPlatformUsers(SAMPLE_PLATFORM_USERS, search, stateFilter)
  const suspended = SAMPLE_PLATFORM_USERS.filter(u => u.state === 'suspended')

  return (
    <>
      <SettingsCell title="Usuarios de la plataforma" soon soonNote={SOON_NOTE} index={0}>
        <UnderlineInput label="buscar" value={search} onChangeText={setSearch} placeholder="nombre, @usuario o email" autoCapitalize="none" />
        <Choice label="Filtrar por estado" options={ACCOUNT_STATE_OPTIONS} value={stateFilter} onChange={setStateFilter} />
        {users.length === 0 ? (
          <EmptyState title="sin resultados" hint="ningún usuario coincide con los filtros" />
        ) : (
          users.map(u => (
            <ListRow
              key={u.id}
              title={u.displayName}
              meta={`@${u.username} · ${u.email} · alta ${formatBackofficeDate(u.createdAt)} · ${u.reports} reportes`}
              state={u.state}
              actions={[u.state === 'active' ? 'suspender' : 'reactivar', 'expediente']}
            />
          ))
        )}
      </SettingsCell>

      <SettingsCell title="Suspender usuario" soon soonNote={SOON_NOTE} index={1}>
        <SuspendForm targetLabel="usuario" placeholder="@usuario o email" />
        <Text variant="meta" tone="muted">
          / La cuenta no va a poder iniciar sesión en ningún servidor mientras dure.
        </Text>
      </SettingsCell>

      <SettingsCell title="Reactivar usuario" soon soonNote={SOON_NOTE} index={2}>
        {suspended.length === 0 ? (
          <EmptyState title="no hay suspendidos" hint="las cuentas suspendidas aparecerán aquí" />
        ) : (
          suspended.map(u => (
            <SettingsRow key={u.id} title={u.displayName} description={`@${u.username} · suspendido`}>
              <BlockButton>Reactivar</BlockButton>
            </SettingsRow>
          ))
        )}
      </SettingsCell>
    </>
  )
}

// ==========================================
// SERVIDORES
// ==========================================

function ServersSection() {
  const [search, setSearch] = useState('')
  const [confirmName, setConfirmName] = useState('')
  const servers = filterPlatformServers(SAMPLE_PLATFORM_SERVERS, search)

  return (
    <>
      <SettingsCell title={`Servidores (${SAMPLE_PLATFORM_SERVERS.length})`} soon soonNote={SOON_NOTE} index={0}>
        <UnderlineInput label="buscar" value={search} onChangeText={setSearch} placeholder="nombre o dueña/o" autoCapitalize="none" />
        {servers.length === 0 ? (
          <EmptyState title="sin resultados" hint="ningún servidor coincide con la búsqueda" />
        ) : (
          servers.map(s => (
            <ListRow
              key={s.id}
              title={s.name}
              meta={`de @${s.owner} · ${s.members} miembros · creado ${formatBackofficeDate(s.createdAt)} · ${s.reports} reportes`}
              state={s.state}
              actions={[s.state === 'active' ? 'suspender' : 'reactivar', 'eliminar', 'expediente']}
            />
          ))
        )}
      </SettingsCell>

      <SettingsCell title="Suspender servidor" soon soonNote={SOON_NOTE} index={1}>
        <SuspendForm targetLabel="servidor" placeholder="nombre o id del servidor" />
        <Text variant="meta" tone="muted">
          / Nadie va a poder entrar, escribir ni hablar en el servidor mientras dure.
        </Text>
      </SettingsCell>

      <SettingsCell title="Eliminar servidor" soon soonNote={SOON_NOTE} index={2}>
        <UnderlineInput label="nombre del servidor" value={confirmName} onChangeText={setConfirmName} hint="escribilo completo para confirmar" />
        <Text variant="meta" tone="muted">
          / Se borran los canales, mensajes y roles. No se puede deshacer.
        </Text>
        <BlockButton tone="danger">Eliminar servidor</BlockButton>
      </SettingsCell>
    </>
  )
}

// ==========================================
// INVESTIGACIÓN
// ==========================================

function InvestigationSection() {
  const styles = useStyles()
  const [target, setTarget] = useState<InvestigationTarget>('user')
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const { subject, stats, events } = SAMPLE_CASE
  const numbers = [
    { label: 'reportes', value: stats.reports },
    { label: 'sanciones', value: stats.sanctions },
    { label: 'servidores', value: stats.servers },
  ]

  return (
    <>
      <SettingsCell title="Buscar expediente" soon soonNote={SOON_NOTE} index={0}>
        <Choice label="Tipo de expediente" options={INVESTIGATION_TARGET_OPTIONS} value={target} onChange={setTarget} />
        <UnderlineInput
          label={target === 'user' ? 'usuario' : 'servidor'}
          value={query}
          onChangeText={setQuery}
          placeholder={target === 'user' ? '@usuario, email o id' : 'nombre o id del servidor'}
          autoCapitalize="none"
        />
        <BlockButton>Abrir expediente</BlockButton>
      </SettingsCell>

      <SettingsCell title="Resumen" soon soonNote={SOON_NOTE} index={1}>
        <View style={styles.stats}>
          {numbers.map(n => (
            <View key={n.label} style={styles.stat}>
              <Text variant="meta" tone="muted">
                {n.label}
              </Text>
              <Text variant="display">{n.value}</Text>
            </View>
          ))}
          <View style={styles.stat}>
            <Text variant="meta" tone="muted">
              estado
            </Text>
            <StateTag state={subject.state} />
          </View>
        </View>
      </SettingsCell>

      <SettingsCell title="Expediente" soon soonNote={SOON_NOTE} index={2}>
        <SettingsRow title={`${subject.displayName}/`} description={`@${subject.username} · alta ${formatBackofficeDate(subject.createdAt)} · ejemplo`}>
          <ActionLink>exportar</ActionLink>
        </SettingsRow>
        <View accessibilityLabel="Historial del expediente">
          {events.map(event => (
            <View key={`${event.date}-${event.text}`} style={styles.event}>
              <Text variant="meta" tone="muted" style={styles.eventDate}>
                {formatBackofficeDate(event.date)}
              </Text>
              <Text variant="bodySmall" style={styles.flex}>
                / {event.text}
              </Text>
            </View>
          ))}
        </View>
        <UnderlineInput label="nota interna" value={note} onChangeText={setNote} placeholder="agregá una nota al expediente" />
      </SettingsCell>
    </>
  )
}

const useStyles = makeStyles(t => ({
  identity: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  flex: { flex: 1, gap: 2 },
  row: { gap: t.space[2], paddingVertical: t.space[3], borderTopWidth: t.lines.hairline, borderTopColor: t.colors.line },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: t.space[5], rowGap: t.space[2] },
  tag: { paddingHorizontal: t.space[1], borderWidth: t.lines.hairline, borderColor: t.colors.lineStrong },
  tagSuspended: { backgroundColor: t.colors.inverseBackground, borderColor: t.colors.inverseBackground },
  stats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: t.space[4] },
  stat: { width: '50%', gap: 2, alignItems: 'flex-start' },
  event: { flexDirection: 'row', gap: t.space[4], paddingVertical: t.space[2], borderTopWidth: t.lines.hairline, borderTopColor: t.colors.line },
  eventDate: { minWidth: 80 },
}))
