import { useState, type FormEvent } from 'react';
import {
  BAN_REASON_MAX_LENGTH,
  IMAGE_UPLOAD_ACCEPT,
  MUTE_DURATIONS,
  PERMISSION_BITS,
  errorMessageFor,
  isLocalCategoryId,
  useCreateCategoryMutation,
  useCreateChannelMutation,
  useDeleteCategoryMutation,
  useDeleteChannelMutation,
} from '@discordia/core';
import type { Category, Channel, ChannelType, Role, Server, ServerMember } from '../../../types';
import { ActionLink, BlockButton, EmptyState, Skeleton, SquareAvatar, UnderlineInput } from '../../../ui';
import { useServerMembersAdmin } from '../../moderation/useServerMembersAdmin';
import { useServerBansAdmin } from '../../moderation/useServerBansAdmin';
import { Choice, Feedback, SettingsCell, SettingsRow, SettingsScreen, Switch, type SettingsSection } from '../SettingsScreen';
import type { ServerSettingsProps } from './useServerSettingsState';
import { PERMISSION_CATEGORIES, PRESET_ROLE_COLORS } from './shared';
import { useServerSettingsState, type ServerSettingsState } from './useServerSettingsState';
import { useUIStore } from '../../../app/uiStore';
import styles from './ServerSettingsScreen.module.css';

type Section = 'overview' | 'roles' | 'members' | 'bans' | 'channels' | 'moderation' | 'notifications' | 'emojis' | 'boost';

const SECTIONS: SettingsSection<Section>[] = [
  { id: 'overview', label: 'Resumen', items: ['Ícono', 'Nombre y descripción', 'Números'] },
  { id: 'roles', label: 'Roles', items: ['Crear rol', 'Roles', 'Editar rol', 'Permisos'] },
  { id: 'members', label: 'Miembros', items: ['Asignar roles', 'Silenciar', 'Expulsar', 'Banear'] },
  { id: 'bans', label: 'Baneos', items: ['Usuarios baneados', 'Revocar'] },
  { id: 'channels', label: 'Canales', items: ['Crear canal', 'Canales por categoría'] },
  { id: 'moderation', label: 'Moderación', items: ['Filtros', 'Palabras bloqueadas', 'Registro de auditoría'] },
  { id: 'notifications', label: 'Notificación', items: ['Frecuencia', 'Silenciar servidor'] },
  { id: 'emojis', label: 'Emojis', items: ['Emojis del servidor'] },
  { id: 'boost', label: 'Mejoras', items: ['Nivel', 'Ventajas'] },
];

export interface ServerSettingsScreenProps extends ServerSettingsProps {
  /** INVITAR en el menú: abre la invitación al servidor. */
  onInvite?: () => void;
  /** ELIMINAR (si sos la dueña) o ABANDONAR en el menú: piden confirmación afuera. */
  onDeleteServer?: () => void;
  onLeaveServer?: () => void;
}

/**
 * Ajustes del servidor del rediseño, sobre SettingsScreen (mismo esqueleto que los de usuario,
 * sección 3 de docs/TODO-REDISENO.md). Roles, miembros (con expulsar y silenciar), baneos y canales van
 * contra el backend (hooks de core). Lo que el backend todavía no guarda (identidad del servidor,
 * moderación, notificaciones, emojis, mejoras) se muestra deshabilitado con "próximamente".
 */
export function ServerSettingsScreen({ onInvite, onDeleteServer, onLeaveServer, ...props }: ServerSettingsScreenProps) {
  const s = useServerSettingsState(props);
  const [section, setSection] = useState<Section>('overview');
  const isOwner = s.serverState.ownerId === s.user.id;

  const actions = [
    ...(onInvite ? [{ label: 'Invitar', onPress: onInvite }] : []),
    ...(isOwner && onDeleteServer ? [{ label: 'Eliminar', onPress: onDeleteServer }] : []),
    ...(!isOwner && onLeaveServer ? [{ label: 'Abandonar', onPress: onLeaveServer }] : []),
  ];

  return (
    <SettingsScreen
      title="Ajustes del servidor"
      identity={
        <div className={styles.identity}>
          <SquareAvatar user={{ displayName: s.serverName, username: s.serverName, avatar: s.serverIcon || null }} size={32} />
          <div>
            <p className={styles.identityName}>{s.serverName}</p>
            <p className={styles.meta}>ajustes del servidor/</p>
          </div>
        </div>
      }
      sections={SECTIONS}
      active={section}
      onSelect={setSection}
      actions={actions}
      onClose={() => props.onClose?.()}
    >
      {section === 'overview' && <OverviewSection s={s} />}
      {section === 'roles' && <RolesSection s={s} />}
      {section === 'members' && (
        <MembersSection serverId={s.serverState.id} ownerId={s.serverState.ownerId} currentUserId={s.user.id} />
      )}
      {section === 'bans' && <BansSection serverId={s.serverState.id} />}
      {/* El servidor de las props (no el estado local): se actualiza cuando el backend confirma */}
      {section === 'channels' && props.server && <ChannelsSection server={props.server} />}
      {section === 'moderation' && <ModerationSection s={s} />}
      {section === 'notifications' && <NotificationsSection s={s} />}
      {section === 'emojis' && <EmojisSection s={s} />}
      {section === 'boost' && <BoostSection s={s} />}
    </SettingsScreen>
  );
}

/** Subir un archivo con una acción de texto (_cambiar ícono, _subir emoji). */
function FileAction({
  label,
  accept,
  onChange,
  disabled = false,
  describedBy,
}: {
  label: string;
  accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <label className={`${styles.fileAction} ${disabled ? styles.fileActionDisabled : ''}`}>
      _{label}
      <input type="file" accept={accept} onChange={onChange} disabled={disabled} aria-describedby={describedBy} className={styles.srOnly} />
    </label>
  );
}

// ==========================================
// RESUMEN
// ==========================================

function OverviewSection({ s }: { s: ServerSettingsState }) {
  const channels = s.categories.reduce((n, c) => n + c.channels.length, 0);
  return (
    <>
      {/* El ícono sí se guarda (PUT /servers/{id}/icon, dueño o Gestionar servidor), apenas se elige */}
      <SettingsCell title="Ícono">
        <div className={styles.iconRow}>
          <SquareAvatar user={{ displayName: s.serverName, username: s.serverName, avatar: s.serverIcon || null }} size="lg" />
          <FileAction
            label={s.iconBusy ? 'subiendo…' : 'cambiar ícono'}
            accept={IMAGE_UPLOAD_ACCEPT}
            onChange={s.handleIconUpload}
            disabled={s.iconBusy}
            describedBy="server-icon-message"
          />
          {s.serverIcon && (
            <ActionLink onPress={s.handleRemoveIcon} disabled={s.iconBusy}>
              quitar ícono
            </ActionLink>
          )}
        </div>
        {s.iconError ? (
          <Feedback tone="error">/ {s.iconError}</Feedback>
        ) : (
          <p id="server-icon-message" className={styles.meta}>
            / JPEG, PNG o WebP, hasta 5 MB. Se guarda al elegirlo y se recorta al centro.
          </p>
        )}
      </SettingsCell>

      {/* Sin PATCH /servers/{id} en el backend: guardar solo cambiaba el caché y se perdía al recargar */}
      <SettingsCell title="Nombre y descripción" soon>
        <UnderlineInput label="nombre del servidor" value={s.serverName} maxLength={100} onChange={(e) => s.setServerName(e.target.value)} />
        <UnderlineInput
          label="descripción"
          value={s.serverDescription}
          maxLength={200}
          placeholder="Contale a quien llega de qué se trata"
          onChange={(e) => s.setServerDescription(e.target.value)}
        />
        <BlockButton onPress={s.handleSaveOverview}>Guardar</BlockButton>
      </SettingsCell>

      {/* Sin "miembros": el servidor no trae la lista (se pide paginada en MIEMBROS) y el número daría 0 */}
      <SettingsCell title="Números">
        <dl className={styles.stats}>
          <div>
            <dt>canales</dt>
            <dd>{channels}</dd>
          </div>
          <div>
            <dt>roles</dt>
            <dd>{s.roles.length}</dd>
          </div>
          <div>
            <dt>nivel</dt>
            <dd>{s.serverState.boostLevel}</dd>
          </div>
          <div>
            <dt>mejoras</dt>
            <dd>{s.serverState.boostCount}</dd>
          </div>
        </dl>
      </SettingsCell>
    </>
  );
}

// ==========================================
// ROLES
// ==========================================

function ColorSwatches({ value, onChange, disabled }: { value: string | null; onChange: (color: string) => void; disabled?: boolean }) {
  return (
    <div className={styles.swatches} role="radiogroup" aria-label="Color del rol">
      {PRESET_ROLE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          className={styles.swatch}
          style={{ background: color }}
          onClick={() => onChange(color)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function RolesSection({ s }: { s: ServerSettingsState }) {
  const role = s.activeRole as Role | undefined;
  return (
    <>
      <SettingsCell title="Crear rol">
        <form className={styles.form} onSubmit={s.handleCreateRole}>
          <UnderlineInput
            label="nombre del rol"
            value={s.newRoleName}
            maxLength={100}
            onChange={(e) => s.setNewRoleName(e.target.value)}
            disabled={s.createRoleMutation.isPending}
          />
          <ColorSwatches value={s.newRoleColor} onChange={(c) => s.setNewRoleColor(s.newRoleColor === c ? null : c)} disabled={s.createRoleMutation.isPending} />
          <BlockButton type="submit" disabled={!s.newRoleName.trim()} loading={s.createRoleMutation.isPending}>
            Crear rol
          </BlockButton>
          {s.roleError && <Feedback tone="error">/ {s.roleError}</Feedback>}
        </form>
      </SettingsCell>

      <SettingsCell title={`Roles — ${s.roles.length}`}>
        {s.rolesQuery.isLoading && <Skeleton lines={4} label="Cargando roles" />}
        {s.rolesQuery.isError && (
          <Feedback tone="error">
            / No se pudieron cargar los roles. <ActionLink onPress={() => s.rolesQuery.refetch()}>reintentar</ActionLink>
          </Feedback>
        )}
        <ul className={styles.roleList}>
          {s.roles.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={`${styles.roleItem} ${role?.id === r.id ? styles.roleItemActive : ''}`}
                onClick={() => s.setActiveRoleId(r.id)}
                aria-current={role?.id === r.id ? 'true' : undefined}
              >
                <span className={styles.roleColor} style={{ background: r.color || 'transparent' }} aria-hidden="true" />
                {r.name}
                {r.isDefault && <span className={styles.meta}> por defecto</span>}
              </button>
            </li>
          ))}
        </ul>
      </SettingsCell>

      {role && (
        <SettingsCell title={`Editar rol — ${role.name}`} wide>
          <div className={styles.roleEditor}>
            <div className={styles.form}>
              <UnderlineInput
                label="nombre"
                value={s.activeName}
                maxLength={100}
                onChange={(e) => s.handleChangeRoleInfo(role, { name: e.target.value })}
                disabled={role.isDefault || s.isSavingRole}
                hint={role.isDefault ? 'El rol por defecto no se puede renombrar.' : undefined}
                error={s.isRoleNameInvalid ? 'El nombre no puede quedar vacío.' : undefined}
              />
              <div>
                <p className={styles.fieldLabel}>color</p>
                <div className={styles.colorRow}>
                  <ColorSwatches value={s.activeColor} onChange={(c) => s.handleChangeRoleInfo(role, { color: c })} disabled={s.isSavingRole} />
                  <input
                    type="color"
                    aria-label="Otro color"
                    className={styles.colorInput}
                    value={s.activeColor}
                    onChange={(e) => s.handleChangeRoleInfo(role, { color: e.target.value })}
                    disabled={s.isSavingRole}
                  />
                </div>
              </div>
              {!role.isDefault && (
                <p className={styles.links}>
                  <ActionLink onPress={() => s.handleSetDefaultRole(role)} disabled={s.setDefaultRoleMutation.isPending}>
                    hacer rol por defecto
                  </ActionLink>
                  {s.roles.length > 1 && (
                    <ActionLink onPress={() => s.handleDeleteRole(role)} disabled={s.deleteRoleMutation.isPending}>
                      eliminar rol
                    </ActionLink>
                  )}
                </p>
              )}

              <div>
                <ActionLink
                  onPress={() => s.setMembersExpandedRoleId(s.isMembersExpanded ? null : role.id)}
                  aria-expanded={s.isMembersExpanded}
                >
                  {`${s.isMembersExpanded ? 'ocultar' : 'ver'} miembros${s.roleMembersQuery.data ? ` (${s.roleMembersQuery.data.length})` : ''}`}
                </ActionLink>
                {s.isMembersExpanded && (
                  <div className={styles.roleMembers}>
                    {s.roleMembersQuery.isLoading && <Skeleton lines={2} label="Cargando miembros" />}
                    {s.roleMembersQuery.isError && <Feedback tone="error">/ No se pudieron cargar los miembros.</Feedback>}
                    {s.roleMembersQuery.isSuccess && s.roleMembersQuery.data.length === 0 && (
                      <p className={styles.meta}>/ ningún miembro tiene este rol.</p>
                    )}
                    {s.roleMembersQuery.data?.map((m) => (
                      <p key={m.id} className={styles.memberLine}>
                        <strong>{m.nickname || s.roleMemberProfiles[m.userId]?.displayName || 'Usuario'}</strong>
                        <span className={styles.meta}> se unió el {new Date(m.joinedAt).toLocaleDateString('es-AR')}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.permissions}>
              {PERMISSION_CATEGORIES.map((cat) => (
                <section key={cat.category} aria-label={cat.category}>
                  <p className={styles.fieldLabel}>{cat.category} /</p>
                  {cat.permissions.map((perm) => {
                    const supported = perm.id in PERMISSION_BITS;
                    return (
                      <SettingsRow key={perm.id} title={perm.name} description={supported ? perm.desc : `${perm.desc} (todavía no disponible)`}>
                        <Switch
                          label={perm.name}
                          checked={s.activePermissions.includes(perm.id)}
                          onChange={() => supported && !s.isSavingRole && s.handleTogglePermission(role, perm.id)}
                        />
                      </SettingsRow>
                    );
                  })}
                </section>
              ))}
            </div>
          </div>

          {(s.hasUnsavedRole || s.roleEditError) && (
            <div className={styles.saveBar} role="status">
              <span>{s.roleEditError ? `/ ${s.roleEditError}` : 'tenés cambios sin guardar/'}</span>
              <span className={styles.links}>
                <ActionLink onPress={() => s.discardRoleDrafts(role.id)} disabled={s.isSavingRole}>
                  descartar
                </ActionLink>
                <span className={styles.saveButton}>
                  <BlockButton onPress={() => s.handleSaveRole(role)} loading={s.isSavingRole} disabled={s.isRoleNameInvalid}>
                    Guardar cambios
                  </BlockButton>
                </span>
              </span>
            </div>
          )}
        </SettingsCell>
      )}
    </>
  );
}

// ==========================================
// MIEMBROS
// ==========================================

function MembersSection({ serverId, ownerId, currentUserId }: { serverId: string; ownerId: string; currentUserId: string }) {
  const m = useServerMembersAdmin(serverId);
  return (
    <SettingsCell title={`Miembros${m.membersQuery.data ? ` — ${m.total}` : ''}`} wide>
      <UnderlineInput label="buscar miembros" value={m.search} onChange={(e) => m.setSearch(e.target.value)} placeholder="nombre o apodo" />
      {m.search.trim() && m.hasNextPage && <p className={styles.meta}>/ La búsqueda solo incluye los miembros ya cargados: bajá para cargar más.</p>}
      {m.error && <Feedback tone="error">/ {m.error}</Feedback>}
      {m.notice && <Feedback>{m.notice}</Feedback>}
      {m.membersQuery.isLoading && <Skeleton lines={5} label="Cargando miembros" />}
      {m.membersQuery.isError && (
        <Feedback tone="error">
          / No se pudieron cargar los miembros. <ActionLink onPress={() => m.membersQuery.refetch()}>reintentar</ActionLink>
        </Feedback>
      )}
      {m.membersQuery.isSuccess && (
        <div ref={m.listRef} className={styles.list}>
          {m.filteredMembers.length === 0 && (
            <EmptyState
              title={m.search.trim() ? 'sin resultados' : 'sin miembros'}
              hint={m.search.trim() ? 'ningún miembro cargado coincide' : 'invitá a alguien al servidor'}
            />
          )}
          {m.filteredMembers.map((member) => (
            <MemberRow key={member.id} m={m} member={member} isOwner={member.userId === ownerId} isMe={member.userId === currentUserId} />
          ))}
          <div ref={m.sentinelRef} />
          {m.isFetchingNextPage && <Skeleton lines={2} label="Cargando más miembros" />}
        </div>
      )}
    </SettingsCell>
  );
}

function MemberRow({
  m,
  member,
  isOwner,
  isMe,
}: {
  m: ReturnType<typeof useServerMembersAdmin>;
  member: ServerMember;
  isOwner: boolean;
  isMe: boolean;
}) {
  const name = m.displayName(member);
  const memberRoles = member.roleIds
    .map((id) => m.rolesById.get(id))
    .filter((r): r is Role => Boolean(r))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const assignable = m.roles.filter((r) => !r.isDefault && !member.roleIds.includes(r.id));

  return (
    <div className={styles.memberRow}>
      <div className={styles.memberMain}>
        <SquareAvatar user={{ displayName: name, username: name }} size={28} />
        <p className={styles.memberName}>
          <strong>{name}</strong>
          {isOwner && <span className={styles.meta}> dueña/o del servidor</span>}
        </p>
        <ul className={styles.chips} aria-label={`Roles de ${name}`}>
          {memberRoles.map((role) => (
            <li key={role.id} className={styles.chip}>
              <span className={styles.roleColor} style={{ background: role.color || 'transparent' }} aria-hidden="true" />
              {role.name}
              {!role.isDefault && (
                <button type="button" onClick={() => m.handleRemove(member, role)} disabled={m.isMutating} aria-label={`Quitar el rol ${role.name}`}>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
        <span className={styles.links}>
          <ActionLink
            onPress={() => {
              m.setBanMemberId(null);
              m.setPickerMemberId(m.pickerMemberId === member.id ? null : member.id);
            }}
            disabled={m.isMutating}
            aria-expanded={m.pickerMemberId === member.id}
          >
            rol +
          </ActionLink>
          {/* Dueña/o y una/o misma/o: el backend lo rechaza, así que no se ofrece */}
          {!isOwner && !isMe && (
            <>
              <ActionLink
                onPress={() => m.openModerationPanel(member, 'mute')}
                disabled={m.isMutating}
                aria-expanded={m.moderationPanel?.memberId === member.id && m.moderationPanel.kind === 'mute'}
              >
                silenciar
              </ActionLink>
              <ActionLink
                onPress={() => m.openModerationPanel(member, 'kick')}
                disabled={m.isMutating}
                aria-expanded={m.moderationPanel?.memberId === member.id && m.moderationPanel.kind === 'kick'}
              >
                expulsar
              </ActionLink>
              <ActionLink onPress={() => m.openBanPanel(member)} disabled={m.isMutating} aria-expanded={m.banMemberId === member.id}>
                banear
              </ActionLink>
            </>
          )}
        </span>
      </div>

      {m.pickerMemberId === member.id && (
        <div className={styles.panel}>
          {assignable.length === 0 ? (
            <p className={styles.meta}>/ no hay más roles para asignar.</p>
          ) : (
            <ul className={styles.chips} aria-label="Asignar rol">
              {assignable.map((role) => (
                <li key={role.id}>
                  <button type="button" className={styles.chipButton} onClick={() => m.handleAssign(member, role.id)}>
                    <span className={styles.roleColor} style={{ background: role.color || 'transparent' }} aria-hidden="true" />
                    {role.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {m.moderationPanel?.memberId === member.id && m.moderationPanel.kind === 'mute' && (
        <div className={styles.panel}>
          <p className={styles.meta}>/ Silenciar a {name}: no va a poder escribir ni hablar en el servidor.</p>
          <Choice
            label="Duración del silencio"
            options={MUTE_DURATIONS.map((d) => ({ value: String(d.seconds), label: d.label }))}
            value={String(m.muteDuration)}
            onChange={(value) => m.setMuteDuration(value === 'null' ? null : Number(value))}
          />
          <UnderlineInput label="motivo (opcional)" value={m.moderationReason} maxLength={500} onChange={(e) => m.setModerationReason(e.target.value)} />
          <span className={styles.links}>
            <ActionLink onPress={() => m.setModerationPanel(null)}>cancelar</ActionLink>
            {/* El backend no dice quién está silenciado: se ofrece quitarlo siempre */}
            <ActionLink onPress={() => m.handleUnmute(member)} disabled={m.unmuteMutation.isPending}>
              quitar silencio
            </ActionLink>
            <BlockButton onPress={() => m.handleMute(member)} loading={m.muteMutation.isPending}>
              Silenciar
            </BlockButton>
          </span>
        </div>
      )}

      {m.moderationPanel?.memberId === member.id && m.moderationPanel.kind === 'kick' && (
        <div className={styles.panel}>
          <p className={styles.meta}>/ ¿Expulsar a {name}? Va a salir del servidor, pero puede volver con una invitación.</p>
          <UnderlineInput label="motivo (opcional)" value={m.moderationReason} maxLength={500} onChange={(e) => m.setModerationReason(e.target.value)} />
          <span className={styles.links}>
            <ActionLink onPress={() => m.setModerationPanel(null)}>cancelar</ActionLink>
            <BlockButton tone="danger" onPress={() => m.handleKick(member)} loading={m.kickMutation.isPending}>
              Expulsar
            </BlockButton>
          </span>
        </div>
      )}

      {m.banMemberId === member.id && (
        <div className={styles.panel}>
          <p className={styles.meta}>/ ¿Banear a {name}? Va a salir del servidor y no va a poder volver hasta que se revoque el baneo.</p>
          <UnderlineInput label="motivo (opcional)" value={m.banReason} maxLength={BAN_REASON_MAX_LENGTH} onChange={(e) => m.setBanReason(e.target.value)} />
          <span className={styles.links}>
            <ActionLink onPress={() => m.setBanMemberId(null)}>cancelar</ActionLink>
            <BlockButton tone="danger" onPress={() => m.handleBan(member)} loading={m.banMutation.isPending}>
              Banear
            </BlockButton>
          </span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// BANEOS
// ==========================================

function BansSection({ serverId }: { serverId: string }) {
  const b = useServerBansAdmin(serverId);
  return (
    <SettingsCell title={`Baneos${b.bansQuery.data ? ` — ${b.bans.length}` : ''}`} wide>
      <UnderlineInput label="buscar baneos" value={b.search} onChange={(e) => b.setSearch(e.target.value)} placeholder="nombre" />
      {b.error && <Feedback tone="error">/ {b.error}</Feedback>}
      {b.notice && <Feedback>{b.notice}</Feedback>}
      {b.bansQuery.isLoading && <Skeleton lines={3} label="Cargando baneos" />}
      {b.bansQuery.isError &&
        (b.isForbidden ? (
          <EmptyState title="sin permiso" hint='necesitás el permiso "Banear miembros" para ver y revocar baneos' />
        ) : (
          <Feedback tone="error">
            / No se pudieron cargar los baneos. <ActionLink onPress={() => b.bansQuery.refetch()}>reintentar</ActionLink>
          </Feedback>
        ))}
      {b.bansQuery.isSuccess && (
        <div className={styles.list}>
          {b.filteredBans.length === 0 && (
            <EmptyState
              title={b.search.trim() ? 'sin resultados' : 'no hay baneos'}
              hint={b.search.trim() ? 'nadie baneado coincide con la búsqueda' : 'los usuarios que banees aparecerán aquí'}
            />
          )}
          {b.filteredBans.map((ban) => {
            const name = b.displayName(ban);
            const confirming = b.confirmUserId === ban.userId;
            return (
              <div key={ban.id} className={styles.memberMain}>
                <SquareAvatar user={{ displayName: name, username: name }} size={28} />
                <p className={styles.memberName}>
                  <strong>{name}</strong>
                  <span className={styles.meta}>
                    {' '}
                    {ban.reason ? `motivo: ${ban.reason}` : 'sin motivo'} · {new Date(ban.createdAt).toLocaleDateString('es-AR')}
                  </span>
                </p>
                <span className={styles.links}>
                  {confirming ? (
                    <>
                      <ActionLink onPress={() => b.setConfirmUserId(null)}>cancelar</ActionLink>
                      <BlockButton onPress={() => b.handleUnban(ban)} loading={b.unbanMutation.isPending}>
                        Revocar
                      </BlockButton>
                    </>
                  ) : (
                    <ActionLink onPress={() => b.setConfirmUserId(ban.userId)} disabled={b.unbanMutation.isPending} aria-label={`Revocar el baneo de ${name}`}>
                      revocar baneo
                    </ActionLink>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SettingsCell>
  );
}

// ==========================================
// CANALES (contra el backend, con los mismos hooks que la barra lateral)
// ==========================================

/** Crear y borrar canales y categorías. Los mensajes de error son los de los modales de la barra lateral. */
function useChannelsAdmin(server: Server) {
  const createChannel = useCreateChannelMutation();
  const deleteChannel = useDeleteChannelMutation();
  const createCategory = useCreateCategoryMutation();
  const deleteCategory = useDeleteCategoryMutation();
  // Solo categorías reales: la general es local y equivale a "sin categoría"
  const realCategories = server.categories.filter((c) => !isLocalCategoryId(c.id));

  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<ChannelType>('text');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, ok: string, errors: Record<number, string>, fallback: string) => {
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(ok);
      return true;
    } catch (err) {
      setError(errorMessageFor(err, errors, fallback));
      return false;
    }
  };

  const handleCreateChannel = async (e: FormEvent) => {
    e.preventDefault();
    const name = channelName.trim();
    if (!name) return;
    const created = await run(
      () => createChannel.mutateAsync({ serverId: server.id, payload: { name, type: channelType, parentId: categoryId || undefined } }),
      `Se creó •${name}.`,
      {
        400: 'Ya existe un canal con ese nombre en esta categoría.',
        403: 'No tenés permisos para crear canales en este servidor.',
        404: 'La categoría ya no existe.',
      },
      'No se pudo crear el canal.'
    );
    if (created) setChannelName('');
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    const created = await run(
      () => createCategory.mutateAsync({ serverId: server.id, payload: { name } }),
      `Se creó la categoría ${name}.`,
      { 403: 'No tenés permisos para crear categorías en este servidor.' },
      'No se pudo crear la categoría.'
    );
    if (created) setCategoryName('');
  };

  // Se confirma con el modal del rediseño (encima de los ajustes), no con el confirm del navegador
  const handleDeleteChannel = (channel: Channel) => {
    useUIStore.getState().openConfirm('delete-channel', channel.name, '', async () => {
      await run(
        () => deleteChannel.mutateAsync({ serverId: server.id, channelId: channel.id }),
        `Se eliminó •${channel.name}.`,
        { 403: 'No tenés permisos para eliminar canales en este servidor.' },
        'No se pudo eliminar el canal.'
      );
    });
  };

  const handleDeleteCategory = (category: Category) => {
    useUIStore.getState().openConfirm('delete-category', category.name, '', async () => {
      await run(
        () => deleteCategory.mutateAsync({ serverId: server.id, categoryId: category.id }),
        `Se eliminó la categoría ${category.name}.`,
        { 403: 'No tenés permisos para eliminar categorías en este servidor.' },
        'No se pudo eliminar la categoría.'
      );
    });
  };

  return {
    realCategories,
    channelName,
    setChannelName,
    channelType,
    setChannelType,
    categoryId,
    setCategoryId,
    categoryName,
    setCategoryName,
    error,
    notice,
    creatingChannel: createChannel.isPending,
    creatingCategory: createCategory.isPending,
    deleting: deleteChannel.isPending || deleteCategory.isPending,
    handleCreateChannel,
    handleCreateCategory,
    handleDeleteChannel,
    handleDeleteCategory,
  };
}

function ChannelsSection({ server }: { server: Server }) {
  const c = useChannelsAdmin(server);
  return (
    <>
      <SettingsCell title="Crear canal">
        <form className={styles.form} onSubmit={c.handleCreateChannel}>
          <UnderlineInput label="nombre del canal" value={c.channelName} placeholder="nuevo-canal" onChange={(e) => c.setChannelName(e.target.value)} />
          <Choice<ChannelType>
            label="Tipo de canal"
            options={[
              { value: 'text', label: 'texto' },
              { value: 'voice', label: 'voz' },
            ]}
            value={c.channelType}
            onChange={c.setChannelType}
          />
          <label className={styles.selectField}>
            <span className={styles.fieldLabel}>categoría</span>
            <select value={c.categoryId} onChange={(e) => c.setCategoryId(e.target.value)}>
              <option value="">sin categoría</option>
              {c.realCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
          <BlockButton type="submit" disabled={!c.channelName.trim()} loading={c.creatingChannel}>
            Crear canal
          </BlockButton>
        </form>
        <form className={styles.form} onSubmit={c.handleCreateCategory}>
          <UnderlineInput label="nueva categoría" value={c.categoryName} onChange={(e) => c.setCategoryName(e.target.value)} />
          <BlockButton type="submit" disabled={!c.categoryName.trim()} loading={c.creatingCategory}>
            Crear categoría
          </BlockButton>
        </form>
        {c.error && <Feedback tone="error">/ {c.error}</Feedback>}
        {c.notice && <Feedback>{c.notice}</Feedback>}
      </SettingsCell>

      <SettingsCell title="Canales por categoría">
        {server.categories.map((cat) => {
          const local = isLocalCategoryId(cat.id);
          return (
            <div key={cat.id}>
              <p className={`${styles.fieldLabel} ${styles.categoryRow}`}>
                <span>{local ? 'Sin categoría' : cat.name} /</span>
                {!local && (
                  <ActionLink onPress={() => c.handleDeleteCategory(cat)} disabled={c.deleting} aria-label={`Eliminar la categoría ${cat.name}`}>
                    eliminar
                  </ActionLink>
                )}
              </p>
              {cat.channels.length === 0 ? (
                <p className={styles.meta}>/ sin canales</p>
              ) : (
                <ul className={styles.channelList}>
                  {cat.channels.map((ch) => (
                    <li key={ch.id}>
                      <span>
                        •{ch.name} <span className={styles.meta}>{ch.type === 'voice' ? 'voz' : 'texto'}</span>
                      </span>
                      <ActionLink onPress={() => c.handleDeleteChannel(ch)} disabled={c.deleting} aria-label={`Eliminar ${ch.name}`}>
                        eliminar
                      </ActionLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </SettingsCell>
    </>
  );
}

// ==========================================
// MODERACIÓN
// ==========================================

function ModerationSection({ s }: { s: ServerSettingsState }) {
  const filters = [
    { title: 'Filtro de contenido explícito', description: 'Revisa las imágenes de todos los miembros.', checked: s.explicitFilter, set: s.setExplicitFilter },
    { title: 'Filtro de spam', description: 'Frena mensajes repetidos y enlaces sospechosos.', checked: s.spamFilter, set: s.setSpamFilter },
    { title: 'Email verificado', description: 'Para escribir hay que tener el email verificado.', checked: s.requireEmail, set: s.setRequireEmail },
    { title: 'Dos factores para moderar', description: 'Quien modera necesita tener activados los dos factores.', checked: s.require2FA, set: s.setRequire2FA },
  ];
  return (
    <>
      <SettingsCell title="Filtros" soon>
        {filters.map((f) => (
          <SettingsRow key={f.title} title={f.title} description={f.description}>
            <Switch label={f.title} checked={f.checked} onChange={f.set} />
          </SettingsRow>
        ))}
      </SettingsCell>
      <SettingsCell title="Palabras bloqueadas" soon>
        <UnderlineInput
          label="palabras y frases"
          value={s.blockedWords}
          onChange={(e) => s.setBlockedWords(e.target.value)}
          hint="separadas por comas; los mensajes que las tengan no se publican"
        />
      </SettingsCell>
      <SettingsCell title="Registro de auditoría" wide soon>
        <EmptyState title="sin acciones registradas" hint="las acciones de administración del servidor aparecerán aquí" />
      </SettingsCell>
    </>
  );
}

// ==========================================
// NOTIFICACIÓN
// ==========================================

function NotificationsSection({ s }: { s: ServerSettingsState }) {
  return (
    <>
      <SettingsCell title="Frecuencia" soon>
        <Choice
          label="Notificaciones del servidor"
          options={[
            { value: 'all', label: 'todos los mensajes' },
            { value: 'mentions', label: 'solo menciones' },
            { value: 'nothing', label: 'nada' },
          ]}
          value={s.notifPreference}
          onChange={s.setNotifPreference}
        />
        <SettingsRow title="Ignorar @everyone y @here" description="No avisar por las menciones a todos.">
          <Switch label="Ignorar @everyone y @here" checked={s.suppressEveryone} onChange={s.setSuppressEveryone} />
        </SettingsRow>
      </SettingsCell>
      <SettingsCell title="Silenciar servidor" soon>
        <SettingsRow title="Silenciar" description="No vas a recibir avisos de este servidor.">
          <Switch label="Silenciar servidor" checked={s.isServerMuted} onChange={s.setIsServerMuted} />
        </SettingsRow>
        {s.isServerMuted && (
          <label className={styles.selectField}>
            <span className={styles.fieldLabel}>durante</span>
            <select value={s.muteDuration} onChange={(e) => s.setMuteDuration(e.target.value)}>
              <option value="15m">15 minutos</option>
              <option value="1h">1 hora</option>
              <option value="8h">8 horas</option>
              <option value="24h">24 horas</option>
              <option value="until_turn_on">hasta que lo vuelva a activar</option>
            </select>
          </label>
        )}
      </SettingsCell>
    </>
  );
}

// ==========================================
// EMOJIS
// ==========================================

function EmojisSection({ s }: { s: ServerSettingsState }) {
  return (
    <SettingsCell title={`Emojis del servidor — ${s.customEmojis.length}`} wide soon>
      <FileAction label="subir emoji" accept="image/*" onChange={s.handleEmojiUpload} />
      {s.customEmojis.length === 0 ? (
        <EmptyState title="sin emojis" hint="subí una imagen chica para usarla como emoji" />
      ) : (
        <ul className={styles.emojis}>
          {s.customEmojis.map((emoji) => (
            <li key={emoji.id}>
              {emoji.url ? <img src={emoji.url} alt="" /> : <span className={styles.emojiPlaceholder} aria-hidden="true" />}
              <span>:{emoji.name}:</span>
              <ActionLink onPress={() => s.setCustomEmojis(s.customEmojis.filter((e) => e.id !== emoji.id))} aria-label={`Eliminar ${emoji.name}`}>
                eliminar
              </ActionLink>
            </li>
          ))}
        </ul>
      )}
    </SettingsCell>
  );
}

// ==========================================
// MEJORAS
// ==========================================

const BOOST_LEVELS = [
  { level: 1, boosts: 2, perks: ['+50 emojis', 'audio de 128 kbps', 'fondo propio para las invitaciones'] },
  { level: 2, boosts: 4, perks: ['+100 emojis', 'audio de 256 kbps', 'archivos de 50 MB para todos', 'transmisiones en 1080p a 60 FPS'] },
  { level: 3, boosts: 7, perks: ['+150 emojis', 'audio de 384 kbps', 'archivos de 100 MB', 'dirección propia del servidor'] },
];

function BoostSection({ s }: { s: ServerSettingsState }) {
  const { boostLevel, boostCount } = s.serverState;
  return (
    <>
      <SettingsCell title="Nivel" soon>
        <p className={styles.bigNumber}>
          {boostLevel}
          <span className={styles.bigUnit}> nivel · {boostCount} mejoras</span>
        </p>
        <div className={styles.meter} role="meter" aria-label="Mejoras para el nivel 3" aria-valuemin={0} aria-valuemax={7} aria-valuenow={boostCount}>
          <span className={styles.meterFill} style={{ transform: `scaleX(${Math.min(1, boostCount / 7)})` }} />
        </div>
        <p className={styles.meta}>/ tenés {s.userPoints.toLocaleString('es-AR')} puntos; cada mejora cuesta 500.</p>
        <span className={styles.links}>
          <BlockButton onPress={s.handleBoostServer}>Mejorar (500 puntos)</BlockButton>
          {s.userBoostedCount > 0 && <ActionLink onPress={s.handleRetractBoost}>retirar mejora</ActionLink>}
        </span>
      </SettingsCell>

      <SettingsCell title="Ventajas" soon>
        {BOOST_LEVELS.map((lvl) => (
          <div key={lvl.level} className={boostLevel >= lvl.level ? undefined : styles.locked}>
            <p className={styles.fieldLabel}>
              Nivel {lvl.level} / {lvl.boosts} mejoras {boostLevel >= lvl.level && '· desbloqueado'}
            </p>
            <ul className={styles.perks}>
              {lvl.perks.map((p) => (
                <li key={p}>/ {p}</li>
              ))}
            </ul>
          </div>
        ))}
      </SettingsCell>
    </>
  );
}
