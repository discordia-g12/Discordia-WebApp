import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useAssignRoleMutation,
  useBanMemberMutation,
  useRemoveRoleMutation,
  useRolesQuery,
  useServerMembersQuery,
  useUserProfiles,
  banErrorMessage,
  kickErrorMessage,
  muteErrorMessage,
  useKickMemberMutation,
  useMuteMemberMutation,
  useUnmuteMemberMutation,
} from '@discordia/core';
import type { Role, ServerMember } from '../../types';

/**
 * Miembros del servidor para los ajustes: lista paginada (la página siguiente se pide cuando el
 * centinela entra en vista), búsqueda en lo cargado, asignar y quitar roles, y banear con motivo.
 * Compartido por la vista del rediseño y la anterior (ServerMembersTab).
 */
export function useServerMembersAdmin(serverId: string) {
  const membersQuery = useServerMembersQuery(serverId);
  const rolesQuery = useRolesQuery(serverId);
  const assignMutation = useAssignRoleMutation(serverId);
  const removeMutation = useRemoveRoleMutation(serverId);
  const banMutation = useBanMemberMutation(serverId);
  const kickMutation = useKickMemberMutation(serverId);
  const muteMutation = useMuteMemberMutation(serverId);
  const unmuteMutation = useUnmuteMemberMutation(serverId);

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
  const isMutating =
    assignMutation.isPending ||
    removeMutation.isPending ||
    banMutation.isPending ||
    kickMutation.isPending ||
    muteMutation.isPending ||
    unmuteMutation.isPending;

  // Panel de expulsar o silenciar de un miembro (con motivo opcional; silenciar, además, la duración)
  const [moderationPanel, setModerationPanel] = useState<{ memberId: string; kind: 'kick' | 'mute' } | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [muteDuration, setMuteDuration] = useState<number | null>(60 * 60);

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
    setModerationPanel(null);
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

  const openModerationPanel = (member: ServerMember, kind: 'kick' | 'mute') => {
    setPickerMemberId(null);
    setBanMemberId(null);
    setModerationReason('');
    const isOpen = moderationPanel?.memberId === member.id && moderationPanel.kind === kind;
    setModerationPanel(isOpen ? null : { memberId: member.id, kind });
  };

  const handleKick = async (member: ServerMember) => {
    setError(null);
    setNotice(null);
    try {
      await kickMutation.mutateAsync({ userId: member.userId, reason: moderationReason });
      setModerationPanel(null);
      setNotice(`${displayName(member)} fue expulsado. Puede volver a unirse con una invitación.`);
    } catch (err) {
      setError(kickErrorMessage(err));
    }
  };

  const handleMute = async (member: ServerMember) => {
    setError(null);
    setNotice(null);
    try {
      await muteMutation.mutateAsync({ userId: member.userId, durationSeconds: muteDuration, reason: moderationReason });
      setModerationPanel(null);
      setNotice(`${displayName(member)} quedó silenciado.`);
    } catch (err) {
      setError(muteErrorMessage(err));
    }
  };

  const handleUnmute = async (member: ServerMember) => {
    setError(null);
    setNotice(null);
    try {
      await unmuteMutation.mutateAsync(member.userId);
      setModerationPanel(null);
      setNotice(`Se quitó el silencio de ${displayName(member)}.`);
    } catch (err) {
      setError(muteErrorMessage(err));
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

  return {
    membersQuery,
    rolesQuery,
    assignMutation,
    removeMutation,
    banMutation,
    search,
    setSearch,
    pickerMemberId,
    setPickerMemberId,
    error,
    notice,
    banMemberId,
    setBanMemberId,
    banReason,
    setBanReason,
    listRef,
    sentinelRef,
    hasNextPage,
    isFetchingNextPage,
    members,
    total,
    profiles,
    roles,
    rolesById,
    isMutating,
    displayName,
    filteredMembers,
    handleAssign,
    openBanPanel,
    handleBan,
    handleRemove,
    kickMutation,
    muteMutation,
    unmuteMutation,
    moderationPanel,
    setModerationPanel,
    moderationReason,
    setModerationReason,
    muteDuration,
    setMuteDuration,
    openModerationPanel,
    handleKick,
    handleMute,
    handleUnmute,
  };
}

export type ServerMembersAdminState = ReturnType<typeof useServerMembersAdmin>;
