import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crown, Loader2, Plus, Search, UserX, X } from 'lucide-react';
import {
  useAssignRoleMutation,
  useBanMemberMutation,
  useRemoveRoleMutation,
  useRolesQuery,
  useServerMembersQuery,
  useUserProfiles,
  BAN_REASON_MAX_LENGTH,
  banErrorMessage,
} from '@discordia/core';
import type { Role, ServerMember } from '../../types';
import styles from './ServerMembersTab.module.css';

export interface ServerMembersTabProps {
  serverId: string;
  ownerId: string;
  currentUserId: string;
}

/**
 * Pestaña de miembros de Server Settings: lista paginada (se carga al hacer scroll)
 * con los roles de cada miembro, y permite asignar o quitar roles y banear miembros.
 */
export const ServerMembersTab: React.FC<ServerMembersTabProps> = ({ serverId, ownerId, currentUserId }) => {
  const membersQuery = useServerMembersQuery(serverId);
  const rolesQuery = useRolesQuery(serverId);
  const assignMutation = useAssignRoleMutation(serverId);
  const removeMutation = useRemoveRoleMutation(serverId);
  const banMutation = useBanMemberMutation(serverId);

  const [search, setSearch] = useState('');
  const [pickerMemberId, setPickerMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Miembro con el panel de baneo abierto (confirmación + motivo opcional)
  const [banMemberId, setBanMemberId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');

  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = membersQuery;
  const members: ServerMember[] = useMemo(
    () => membersQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [membersQuery.data]
  );
  const total = membersQuery.data?.pages[0]?.total ?? 0;
  const profiles = useUserProfiles(members.map((member) => member.userId));

  const roles: Role[] = rolesQuery.data ?? [];
  const rolesById = useMemo(() => new Map(roles.map((role) => [role.id, role])), [roles]);
  const isMutating = assignMutation.isPending || removeMutation.isPending || banMutation.isPending;

  // Carga la siguiente página cuando el final de la lista entra en vista
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { root: listRef.current }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, members.length]);

  // Apodo en el servidor > nombre del perfil
  const displayName = (member: ServerMember) =>
    member.nickname || profiles[member.userId]?.displayName || 'Usuario';

  const filteredMembers = members.filter((member) =>
    displayName(member).toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleAssign = async (member: ServerMember, roleId: string) => {
    setError(null);
    setPickerMemberId(null);
    try {
      await assignMutation.mutateAsync({ roleId, userId: member.userId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar el rol.');
    }
  };

  const openBanPanel = (member: ServerMember) => {
    setPickerMemberId(null);
    setBanReason('');
    setBanMemberId(banMemberId === member.id ? null : member.id);
  };

  const handleBan = async (member: ServerMember) => {
    setError(null);
    setNotice(null);
    try {
      await banMutation.mutateAsync({ userId: member.userId, reason: banReason });
      setBanMemberId(null);
      setNotice(`${displayName(member)} fue baneado del servidor.`);
    } catch (err) {
      setError(banErrorMessage(err));
    }
  };

  const handleRemove = async (member: ServerMember, role: Role) => {
    setError(null);
    try {
      await removeMutation.mutateAsync({ roleId: role.id, userId: member.userId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el rol.');
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.rootDiv}>
        <div className={styles.rootDivDiv}>
          Server Members{membersQuery.data ? ` (${total})` : ''}
        </div>

        <div className={styles.rootDivDiv2}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className={styles.searchMembers}
          />
        </div>
      </div>

      {search.trim() && hasNextPage && (
        <div className={styles.rootDiv2}>
          La búsqueda solo incluye los miembros ya cargados; seguí bajando en la lista para cargar más.
        </div>
      )}

      {error && (
        <div className={styles.rootDiv3}>
          {error}
        </div>
      )}

      {notice && (
        <div className={styles.rootDiv4}>
          {notice}
        </div>
      )}

      {membersQuery.isLoading && (
        <div className={styles.rootDiv5}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando miembros...
        </div>
      )}

      {membersQuery.isError && (
        <div className={styles.rootDiv6}>
          {membersQuery.error instanceof Error ? membersQuery.error.message : 'No se pudieron cargar los miembros.'}{' '}
          <button
            type="button"
            onClick={() => membersQuery.refetch()}
            className={styles.reintentar}
          >
            Reintentar
          </button>
        </div>
      )}

      {membersQuery.isSuccess && (
        <div
          ref={listRef}
          className={styles.rootDiv7}
        >
          {filteredMembers.length === 0 && (
            <div className={styles.rootDiv7Div}>
              {search.trim() ? 'Ningún miembro cargado coincide con la búsqueda.' : 'Este servidor no tiene miembros.'}
            </div>
          )}

          {filteredMembers.map((member) => {
            const isOwner = member.userId === ownerId;
            // El backend también lo rechaza; se oculta para no ofrecer una acción imposible
            const canShowBan = !isOwner && member.userId !== currentUserId;
            const name = displayName(member);
            const memberRoles = member.roleIds
              .map((roleId) => rolesById.get(roleId))
              .filter((role): role is Role => Boolean(role))
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            const assignableRoles = roles.filter(
              (role) => !role.isDefault && !member.roleIds.includes(role.id)
            );

            return (
              <div key={member.id} className={styles.rootDiv7Div2}>
              <div className={styles.rootDiv7Div2Div}>
                <div className={styles.rootDiv7Div2DivDiv}>
                  <div className={styles.rootDiv7Div2DivDivDiv}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.rootDiv7Div2DivDivDiv2}>
                    <span className={styles.rootDiv7Div2DivDivDiv2Span}>
                      {name}
                    </span>
                    {isOwner && (
                      <span title="Server Owner" className={styles.serverOwner}>
                        <Crown size={15} />
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.rootDiv7Div2DivDiv2}>
                  {memberRoles.map((role) => (
                    <span
                      key={role.id}
                      className={styles.rootDiv7Div2DivDiv2Span}
                    >
                      <span
                        className={styles.rootDiv7Div2DivDiv2SpanSpan} style={{ backgroundColor: role.color }}
                      />
                      {role.name}
                      {!role.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleRemove(member, role)}
                          disabled={isMutating}
                          title={`Quitar el rol ${role.name}`}
                          className={styles.rootDiv7Div2DivDiv2SpanButton} style={{ cursor: isMutating ? 'default' : 'pointer' }}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setBanMemberId(null);
                      setPickerMemberId(pickerMemberId === member.id ? null : member.id);
                    }}
                    disabled={isMutating}
                    title="Asignar un rol"
                    className={styles.asignarUnRol} style={{ cursor: isMutating ? 'default' : 'pointer' }}
                  >
                    <Plus size={12} />
                  </button>

                  {canShowBan && (
                    <button
                      type="button"
                      onClick={() => openBanPanel(member)}
                      disabled={isMutating}
                      title={`Banear a ${name}`}
                      className={styles.rootDiv7Div2DivDiv2Button} style={{ cursor: isMutating ? 'default' : 'pointer' }}
                    >
                      <UserX size={12} />
                    </button>
                  )}
                </div>
              </div>

              {banMemberId === member.id && (
                <div className={styles.rootDiv7Div2Div2}>
                  <span className={styles.rootDiv7Div2Div2Span}>
                    ¿Banear a {name}? Va a salir del servidor y no podrá volver a unirse hasta que se revoque el baneo.
                  </span>
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    maxLength={BAN_REASON_MAX_LENGTH}
                    placeholder="Motivo (opcional)"
                    className={styles.motivoOpcional}
                  />
                  <div className={styles.rootDiv7Div2Div2Div}>
                    <button
                      type="button"
                      onClick={() => setBanMemberId(null)}
                      className={styles.cancelar}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBan(member)}
                      disabled={banMutation.isPending}
                      className={styles.rootDiv7Div2Div2DivButton} style={{ cursor: banMutation.isPending ? 'default' : 'pointer' }}
                    >
                      {banMutation.isPending && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                      Banear
                    </button>
                  </div>
                </div>
              )}

              {pickerMemberId === member.id && (
                <div className={styles.rootDiv7Div2Div3}>
                  {assignableRoles.length === 0 ? (
                    <span className={styles.rootDiv2}>No hay más roles para asignar.</span>
                  ) : (
                    <>
                      <span className={styles.rootDiv2}>Asignar rol:</span>
                      {assignableRoles.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleAssign(member, role.id)}
                          className={styles.rootDiv7Div2Div3Button}
                        >
                          <span
                            className={styles.rootDiv7Div2DivDiv2SpanSpan} style={{ backgroundColor: role.color }}
                          />
                          {role.name}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
              </div>
            );
          })}

          <div ref={sentinelRef} className={styles.rootDiv7Div3} />
          {isFetchingNextPage && (
            <div className={styles.rootDiv7Div4}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando más miembros...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServerMembersTab;
