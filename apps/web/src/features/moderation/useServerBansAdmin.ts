import { useState } from 'react';
import { useServerBansQuery, useUnbanMemberMutation, useUserProfiles, ApiError, unbanErrorMessage } from '@discordia/core';
import type { ServerBan } from '../../types';

/**
 * Baneos del servidor para los ajustes: lista, búsqueda y revocar (con confirmación en la fila). Requiere
 * BAN_MEMBERS; el backend valida el permiso (403: isForbidden). Compartido por las dos vistas.
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

  const filteredBans = bans.filter((ban) =>
    displayName(ban).toLowerCase().includes(search.trim().toLowerCase())
  );

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
