import { useMemo, useState } from 'react';
import {
  useAssignRoleMutation,
  useBanMemberMutation,
  useKickMemberMutation,
  useMuteMemberMutation,
  useRemoveRoleMutation,
  useRolesQuery,
  useServerBansQuery,
  useServerMembersQuery,
  useUnbanMemberMutation,
  useUnmuteMemberMutation,
  usePendingServerTransferQuery,
  useInitiateServerTransferMutation,
  useAcceptServerTransferMutation,
  useRejectServerTransferMutation,
  useCancelServerTransferMutation,
} from '../hooks/useApi';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { banErrorMessage, kickErrorMessage, muteErrorMessage, unbanErrorMessage } from '../api/moderation';
import { transferErrorMessage } from '../api/serverTransfer';
import { ApiError } from '../api/errors';
import type { Role, ServerBan, ServerMember } from '../types';

/**
 * Miembros del servidor para los ajustes (web y mobile): lista paginada (cada plataforma pide la página
 * siguiente al llegar al final, con fetchNextPage), búsqueda en lo cargado, asignar y quitar roles, y
 * banear, expulsar y silenciar con motivo.
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
  const pendingTransferQuery = usePendingServerTransferQuery(serverId);
  const initiateTransferMutation = useInitiateServerTransferMutation(serverId);
  const acceptTransferMutation = useAcceptServerTransferMutation(serverId);
  const rejectTransferMutation = useRejectServerTransferMutation(serverId);
  const cancelTransferMutation = useCancelServerTransferMutation(serverId);

  const [search, setSearch] = useState('');
  const [pickerMemberId, setPickerMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [transferMember, setTransferMember] = useState<ServerMember | null>(null);
  // Miembro con el panel de baneo abierto (confirmación + motivo opcional)
  const [banMemberId, setBanMemberId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = membersQuery;
  const members: ServerMember[] = useMemo(() => membersQuery.data?.pages.flatMap((page) => page.items) ?? [], [membersQuery.data]);
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
    unmuteMutation.isPending ||
    initiateTransferMutation.isPending ||
    acceptTransferMutation.isPending ||
    rejectTransferMutation.isPending ||
    cancelTransferMutation.isPending;

  // Panel de expulsar o silenciar de un miembro (con motivo opcional; silenciar, además, la duración)
  const [moderationPanel, setModerationPanel] = useState<{ memberId: string; kind: 'kick' | 'mute' } | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [muteDuration, setMuteDuration] = useState<number | null>(60 * 60);

  /** Pide la página siguiente si hay y no se está pidiendo ya (al llegar al final de la lista). */
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  // Apodo en el servidor > nombre del perfil
  const displayName = (member: ServerMember) => member.nickname || profiles[member.userId]?.displayName || 'Usuario';

  const filteredMembers = members.filter((member) => displayName(member).toLowerCase().includes(search.trim().toLowerCase()));

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

  const handleTransferOwnership = async (member: ServerMember) => {
    setError(null);
    setNotice(null);
    try {
      await initiateTransferMutation.mutateAsync(member.userId);
      setTransferMember(null);
      setNotice(`Se envió la solicitud de transferencia a ${displayName(member)}.`);
    } catch (err) {
      setError(transferErrorMessage(err));
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    setError(null);
    setNotice(null);
    try {
      await cancelTransferMutation.mutateAsync(transferId);
      setNotice('Se canceló la solicitud de transferencia de propiedad.');
    } catch (err) {
      setError(transferErrorMessage(err));
    }
  };

  const handleAcceptTransfer = async (transferId?: string) => {
    setError(null);
    setNotice(null);
    try {
      await acceptTransferMutation.mutateAsync(transferId);
      setNotice('Aceptaste la transferencia de propiedad. Ahora sos la dueña/el dueño del servidor.');
    } catch (err) {
      setError(transferErrorMessage(err));
    }
  };

  const handleRejectTransfer = async (transferId?: string) => {
    setError(null);
    setNotice(null);
    try {
      await rejectTransferMutation.mutateAsync(transferId);
      setNotice('Rechazaste la transferencia de propiedad.');
    } catch (err) {
      setError(transferErrorMessage(err));
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
    transferMember,
    setTransferMember,
    pendingTransfer: pendingTransferQuery.data ?? null,
    pendingTransferQuery,
    initiateTransferMutation,
    acceptTransferMutation,
    rejectTransferMutation,
    cancelTransferMutation,
    handleTransferOwnership,
    handleAcceptTransfer,
    handleRejectTransfer,
    handleCancelTransfer,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
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

/**
 * Baneos del servidor para los ajustes: lista, búsqueda y revocar (con confirmación en la fila). Requiere
 * BAN_MEMBERS; el backend valida el permiso (403: isForbidden).
 */
export function useServerBansAdmin(serverId: string) {
  const bansQuery = useServerBansQuery(serverId);
  const unbanMutation = useUnbanMemberMutation(serverId);

  const [search, setSearch] = useState('');
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const bans: ServerBan[] = bansQuery.data ?? [];
  const profiles = useUserProfiles(bans.map((ban) => ban.userId));

  const displayName = (ban: ServerBan) => profiles[ban.userId]?.displayName || 'Usuario';

  const filteredBans = bans.filter((ban) => displayName(ban).toLowerCase().includes(search.trim().toLowerCase()));

  const isForbidden = bansQuery.error instanceof ApiError && bansQuery.error.status === 403;

  const handleUnban = async (ban: ServerBan) => {
    setError(null);
    setNotice(null);
    setConfirmUserId(null);
    try {
      await unbanMutation.mutateAsync(ban.userId);
      setNotice(`Se revocó el baneo de ${displayName(ban)}. Ya puede volver a unirse con una invitación.`);
    } catch (err) {
      setError(unbanErrorMessage(err));
      // Si otro moderador ya lo desbaneó, la lista quedó desactualizada
      if (err instanceof ApiError && err.status === 404) bansQuery.refetch();
    }
  };

  return {
    bansQuery,
    unbanMutation,
    search,
    setSearch,
    confirmUserId,
    setConfirmUserId,
    error,
    notice,
    bans,
    displayName,
    filteredBans,
    isForbidden,
    handleUnban,
  };
}

export type ServerBansAdminState = ReturnType<typeof useServerBansAdmin>;
