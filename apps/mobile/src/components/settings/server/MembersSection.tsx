import React from 'react'
import { Pressable, View } from 'react-native'
import {
  BAN_REASON_MAX_LENGTH,
  MUTE_DURATIONS,
  type Role,
  type ServerBansAdminState,
  type ServerMember,
  type ServerMembersAdminState,
} from '@discordia/core'
import { makeStyles } from '../../../theme'
import { ActionLink, BlockButton, Choice, EmptyState, Skeleton, SquareAvatar, Text, UnderlineInput } from '../../../ui'
import { Feedback, SettingsCell } from '../SettingsScreen'
import { RoleSwatch } from './RolesSection'

interface MembersSectionProps {
  members: ServerMembersAdminState
  ownerId: string
  currentUserId: string
}

/**
 * MIEMBROS: búsqueda en lo cargado y cada miembro con sus roles (× para quitar, _rol + para asignar) y
 * _silenciar, _expulsar y _banear, cada uno con su panel (motivo opcional; silenciar, con la duración).
 */
export function MembersSection({ members: m, ownerId, currentUserId }: MembersSectionProps) {
  const styles = useStyles()
  return (
    <SettingsCell title={`Miembros${m.total ? ` (${m.total})` : ''}`}>
      <UnderlineInput label="buscar" value={m.search} onChangeText={m.setSearch} placeholder="nombre o apodo" autoCapitalize="none" />
      {m.error && <Feedback tone="error">{m.error}</Feedback>}
      {m.notice && <Feedback>{m.notice}</Feedback>}
      {m.membersQuery.isLoading ? (
        <Skeleton lines={5} label="Cargando miembros" />
      ) : m.membersQuery.isError ? (
        <View style={styles.links}>
          <Feedback tone="error">No se pudieron cargar los miembros.</Feedback>
          <ActionLink onPress={() => m.membersQuery.refetch()}>reintentar</ActionLink>
        </View>
      ) : m.filteredMembers.length === 0 ? (
        <EmptyState title="sin resultados" hint={m.search ? 'probá con otro nombre' : 'este servidor no tiene miembros'} />
      ) : (
        m.filteredMembers.map(member => (
          <MemberRow key={member.id} m={m} member={member} isOwner={member.userId === ownerId} isMe={member.userId === currentUserId} />
        ))
      )}
      {m.hasNextPage && (
        <ActionLink onPress={m.loadMore} disabled={m.isFetchingNextPage}>
          {m.isFetchingNextPage ? 'cargando' : 'cargar más'}
        </ActionLink>
      )}
    </SettingsCell>
  )
}

function MemberRow({ m, member, isOwner, isMe }: { m: ServerMembersAdminState; member: ServerMember; isOwner: boolean; isMe: boolean }) {
  const styles = useStyles()
  const name = m.displayName(member)
  const memberRoles = member.roleIds
    .map(id => m.rolesById.get(id))
    .filter((r): r is Role => Boolean(r))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const assignable = m.roles.filter(r => !r.isDefault && !member.roleIds.includes(r.id))
  const panel = m.moderationPanel?.memberId === member.id ? m.moderationPanel.kind : null

  return (
    <View style={styles.member}>
      <View style={styles.memberMain}>
        <SquareAvatar user={{ username: name }} size={28} />
        <Text variant="bodySmall" bold numberOfLines={1} style={styles.flex}>
          {name}
          {isOwner && (
            <Text variant="meta" tone="muted">
              {' '}a cargo del servidor
            </Text>
          )}
        </Text>
      </View>
      {memberRoles.length > 0 && (
        <View style={styles.chips} accessibilityLabel={`Roles de ${name}`}>
          {memberRoles.map(role => (
            <View key={role.id} style={styles.chip}>
              <RoleSwatch color={role.color} />
              <Text variant="meta">{role.name}</Text>
              {!role.isDefault && (
                <Pressable onPress={() => m.handleRemove(member, role)} disabled={m.isMutating} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Quitar el rol ${role.name}`}>
                  <Text variant="meta">×</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}
      <View style={styles.links}>
        <ActionLink
          onPress={() => {
            m.setBanMemberId(null)
            m.setPickerMemberId(m.pickerMemberId === member.id ? null : member.id)
          }}
          disabled={m.isMutating}
        >
          rol +
        </ActionLink>
        {/* Dueña/o y una/o misma/o: el backend lo rechaza, así que no se ofrece */}
        {!isOwner && !isMe && (
          <>
            <ActionLink onPress={() => m.openModerationPanel(member, 'mute')} disabled={m.isMutating}>
              silenciar
            </ActionLink>
            <ActionLink onPress={() => m.openModerationPanel(member, 'kick')} disabled={m.isMutating}>
              expulsar
            </ActionLink>
            <ActionLink onPress={() => m.openBanPanel(member)} disabled={m.isMutating}>
              banear
            </ActionLink>
          </>
        )}
      </View>

      {m.pickerMemberId === member.id && (
        <View style={styles.panel}>
          {assignable.length === 0 ? (
            <Text variant="meta" tone="muted">
              / no hay más roles para asignar.
            </Text>
          ) : (
            <View style={styles.chips} accessibilityLabel="Asignar rol">
              {assignable.map(role => (
                <Pressable key={role.id} style={styles.chipButton} onPress={() => m.handleAssign(member, role.id)} accessibilityRole="button" accessibilityLabel={`Asignar ${role.name}`}>
                  <RoleSwatch color={role.color} />
                  <Text variant="meta">{role.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {panel === 'mute' && (
        <View style={styles.panel}>
          <Text variant="meta" tone="muted">
            / Silenciar a {name}: no va a poder escribir ni hablar en el servidor.
          </Text>
          <Choice
            label="Duración del silencio"
            options={MUTE_DURATIONS.map(d => ({ value: String(d.seconds), label: d.label }))}
            value={String(m.muteDuration)}
            onChange={value => m.setMuteDuration(value === 'null' ? null : Number(value))}
          />
          <UnderlineInput label="motivo (opcional)" value={m.moderationReason} maxLength={500} onChangeText={m.setModerationReason} />
          <View style={styles.actions}>
            <ActionLink onPress={() => m.setModerationPanel(null)}>cancelar</ActionLink>
            {/* El backend no dice quién está silenciado: se ofrece quitarlo siempre */}
            <ActionLink onPress={() => m.handleUnmute(member)} disabled={m.unmuteMutation.isPending}>
              quitar silencio
            </ActionLink>
            <BlockButton onPress={() => m.handleMute(member)} loading={m.muteMutation.isPending}>
              Silenciar
            </BlockButton>
          </View>
        </View>
      )}

      {panel === 'kick' && (
        <View style={styles.panel}>
          <Text variant="meta" tone="muted">
            / ¿Expulsar a {name}? Va a salir del servidor, pero puede volver con una invitación.
          </Text>
          <UnderlineInput label="motivo (opcional)" value={m.moderationReason} maxLength={500} onChangeText={m.setModerationReason} />
          <View style={styles.actions}>
            <ActionLink onPress={() => m.setModerationPanel(null)}>cancelar</ActionLink>
            <BlockButton tone="danger" onPress={() => m.handleKick(member)} loading={m.kickMutation.isPending}>
              Expulsar
            </BlockButton>
          </View>
        </View>
      )}

      {m.banMemberId === member.id && (
        <View style={styles.panel}>
          <Text variant="meta" tone="muted">
            / ¿Banear a {name}? Sale del servidor y no puede volver a entrar hasta que se revoque el baneo.
          </Text>
          <UnderlineInput label="motivo (opcional)" value={m.banReason} maxLength={BAN_REASON_MAX_LENGTH} onChangeText={m.setBanReason} />
          <View style={styles.actions}>
            <ActionLink onPress={() => m.setBanMemberId(null)}>cancelar</ActionLink>
            <BlockButton tone="danger" onPress={() => m.handleBan(member)} loading={m.banMutation.isPending}>
              Banear
            </BlockButton>
          </View>
        </View>
      )}
    </View>
  )
}

/** BANEOS: los baneados con motivo y fecha, y _revocar con confirmación en la fila. Sin permiso, un vacío que lo explica. */
export function BansSection({ bans: b }: { bans: ServerBansAdminState }) {
  const styles = useStyles()
  return (
    <SettingsCell title="Usuarios baneados">
      {b.error && <Feedback tone="error">{b.error}</Feedback>}
      {b.notice && <Feedback>{b.notice}</Feedback>}
      {b.bansQuery.isLoading ? (
        <Skeleton lines={3} label="Cargando baneos" />
      ) : b.isForbidden ? (
        <EmptyState title="no podés ver los baneos" hint="hace falta el permiso de banear miembros" />
      ) : b.bansQuery.isError ? (
        <View style={styles.links}>
          <Feedback tone="error">No se pudieron cargar los baneos.</Feedback>
          <ActionLink onPress={() => b.bansQuery.refetch()}>reintentar</ActionLink>
        </View>
      ) : b.bans.length === 0 ? (
        <EmptyState title="no hay nadie baneado" hint="los baneos del servidor aparecen acá" />
      ) : (
        <>
          <UnderlineInput label="buscar" value={b.search} onChangeText={b.setSearch} autoCapitalize="none" />
          {b.filteredBans.map(ban => (
            <View key={ban.id} style={styles.member}>
              <View style={styles.memberMain}>
                <SquareAvatar user={{ username: b.displayName(ban) }} size={28} />
                <View style={styles.flex}>
                  <Text variant="bodySmall" bold numberOfLines={1}>
                    {b.displayName(ban)}
                  </Text>
                  <Text variant="meta" tone="muted">
                    {ban.reason ? `motivo: ${ban.reason}` : 'sin motivo'} · {new Date(ban.createdAt).toLocaleDateString('es-AR')}
                  </Text>
                </View>
              </View>
              {b.confirmUserId === ban.userId ? (
                <View style={styles.actions}>
                  <Text variant="meta" tone="muted" style={styles.flex}>
                    / Va a poder volver a unirse con una invitación.
                  </Text>
                  <ActionLink onPress={() => b.setConfirmUserId(null)}>cancelar</ActionLink>
                  <BlockButton onPress={() => b.handleUnban(ban)} loading={b.unbanMutation.isPending}>
                    Revocar
                  </BlockButton>
                </View>
              ) : (
                <View style={styles.links}>
                  <ActionLink onPress={() => b.setConfirmUserId(ban.userId)}>revocar</ActionLink>
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </SettingsCell>
  )
}

const useStyles = makeStyles(t => ({
  flex: { flex: 1 },
  member: { gap: t.space[2], paddingVertical: t.space[3], borderTopWidth: t.lines.hairline, borderTopColor: t.colors.line },
  memberMain: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  chip: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], paddingHorizontal: t.space[2], paddingVertical: 2, borderWidth: t.lines.hairline, borderColor: t.colors.line },
  chipButton: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], paddingHorizontal: t.space[2], paddingVertical: t.space[1], borderWidth: t.lines.hairline, borderColor: t.colors.lineStrong },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: t.space[5], rowGap: t.space[2] },
  panel: { gap: t.space[3], padding: t.space[3], borderWidth: t.lines.hairline, borderColor: t.colors.lineStrong },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: t.space[4] },
}))
