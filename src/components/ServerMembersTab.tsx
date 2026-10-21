import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crown, Loader2, Plus, Search, UserX, X } from 'lucide-react';
import {
  useAssignRoleMutation,
  useBanMemberMutation,
  useRemoveRoleMutation,
  useRolesQuery,
  useServerMembersQuery,
} from '../api/hooks/useApi';
import { useUserProfiles } from '../api/hooks/useUserProfiles';
import { BAN_REASON_MAX_LENGTH, banErrorMessage } from '../api/moderation';
import type { Role, ServerMember } from '../types';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f3f5' }}>
          Server Members{membersQuery.data ? ` (${total})` : ''}
        </div>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#949ba4' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            style={{
              width: '100%',
              backgroundColor: '#1e1f22',
              color: '#dbdee1',
              border: '1px solid rgba(0, 0, 0, 0.3)',
              borderRadius: 4,
              padding: '8px 12px 8px 34px',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {search.trim() && hasNextPage && (
        <div style={{ fontSize: 12, color: '#949ba4' }}>
          La búsqueda solo incluye los miembros ya cargados; seguí bajando en la lista para cargar más.
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(218, 55, 60, 0.15)',
            border: '1px solid rgba(218, 55, 60, 0.3)',
            color: '#fa777c',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          style={{
            backgroundColor: 'rgba(35, 165, 90, 0.15)',
            border: '1px solid rgba(35, 165, 90, 0.3)',
            color: '#57f287',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: 12,
          }}
        >
          {notice}
        </div>
      )}

      {membersQuery.isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#949ba4', fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando miembros...
        </div>
      )}

      {membersQuery.isError && (
        <div style={{ fontSize: 13, color: '#fa777c' }}>
          {membersQuery.error instanceof Error ? membersQuery.error.message : 'No se pudieron cargar los miembros.'}{' '}
          <button
            type="button"
            onClick={() => membersQuery.refetch()}
            style={{ background: 'none', border: 'none', color: '#00a8fc', cursor: 'pointer', padding: 0, fontSize: 13 }}
          >
            Reintentar
          </button>
        </div>
      )}

      {membersQuery.isSuccess && (
        <div
          ref={listRef}
          style={{ backgroundColor: '#2b2d31', borderRadius: 8, maxHeight: 520, overflowY: 'auto' }}
        >
          {filteredMembers.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: '#949ba4' }}>
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
              <div key={member.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: '#5865f2',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#f2f3f5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {name}
                    </span>
                    {isOwner && (
                      <span title="Server Owner" style={{ color: '#faa81a', display: 'flex', alignItems: 'center' }}>
                        <Crown size={15} />
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    gap: 6,
                  }}
                >
                  {memberRoles.map((role) => (
                    <span
                      key={role.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: '#dbdee1',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: role.color, flexShrink: 0 }}
                      />
                      {role.name}
                      {!role.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleRemove(member, role)}
                          disabled={isMutating}
                          title={`Quitar el rol ${role.name}`}
                          style={{
                            display: 'flex',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#949ba4',
                            cursor: isMutating ? 'default' : 'pointer',
                          }}
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      backgroundColor: 'transparent',
                      color: '#949ba4',
                      border: '1px dashed rgba(255, 255, 255, 0.25)',
                      cursor: isMutating ? 'default' : 'pointer',
                    }}
                  >
                    <Plus size={12} />
                  </button>

                  {canShowBan && (
                    <button
                      type="button"
                      onClick={() => openBanPanel(member)}
                      disabled={isMutating}
                      title={`Banear a ${name}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        borderRadius: 4,
                        backgroundColor: 'transparent',
                        color: '#fa777c',
                        border: '1px solid rgba(218, 55, 60, 0.4)',
                        cursor: isMutating ? 'default' : 'pointer',
                      }}
                    >
                      <UserX size={12} />
                    </button>
                  )}
                </div>
              </div>

              {banMemberId === member.id && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: '0 16px 12px 64px',
                  }}
                >
                  <span style={{ fontSize: 12, color: '#dbdee1' }}>
                    ¿Banear a {name}? Va a salir del servidor y no podrá volver a unirse hasta que se revoque el baneo.
                  </span>
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    maxLength={BAN_REASON_MAX_LENGTH}
                    placeholder="Motivo (opcional)"
                    style={{
                      backgroundColor: '#1e1f22',
                      color: '#dbdee1',
                      border: '1px solid rgba(0, 0, 0, 0.3)',
                      borderRadius: 4,
                      padding: '6px 10px',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setBanMemberId(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dbdee1',
                        cursor: 'pointer',
                        fontSize: 13,
                        padding: '6px 10px',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBan(member)}
                      disabled={banMutation.isPending}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#da373c',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '6px 12px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: banMutation.isPending ? 'default' : 'pointer',
                      }}
                    >
                      {banMutation.isPending && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                      Banear
                    </button>
                  </div>
                </div>
              )}

              {pickerMemberId === member.id && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 6,
                    padding: '0 16px 12px 64px',
                  }}
                >
                  {assignableRoles.length === 0 ? (
                    <span style={{ fontSize: 12, color: '#949ba4' }}>No hay más roles para asignar.</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, color: '#949ba4' }}>Asignar rol:</span>
                      {assignableRoles.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleAssign(member, role.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            color: '#dbdee1',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 4,
                            padding: '3px 8px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <span
                            style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: role.color, flexShrink: 0 }}
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

          <div ref={sentinelRef} style={{ height: 1 }} />
          {isFetchingNextPage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, color: '#949ba4', fontSize: 12 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando más miembros...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ServerMembersTab;
