import { useMemo } from 'react';
import { usePresenceQuery, useSession } from '@discordia/core';
import { useUsers } from '../../app/usersContext';
import { useCurrentUser } from '../profile/currentUserStore';
import { openUserProfile } from '../profile/profileActions';
import { MemberList } from './MemberList';
import { useCurrentServer, useServerMemberUsers } from './useCurrentServer';

/** Lista de miembros del servidor (panel derecho del chat). */
export function MemberListPanel() {
  const { currentServer } = useCurrentServer();
  const currentUser = useCurrentUser();
  const memberUsers = useServerMemberUsers();
  const { usersMap } = useUsers();
  const linkedUserId = useSession((s) => s.profile?.user_id);
  // El propio usuario (por id o por la cuenta vinculada) ya trae el estado que eligió: no se pide
  const myIds = useMemo(() => new Set([currentUser.id, linkedUserId]), [currentUser.id, linkedUserId]);
  const { data: presence } = usePresenceQuery(memberUsers.map((u) => u.id).filter((id) => !myIds.has(id)));

  const members = useMemo(
    () =>
      memberUsers.map((u) =>
        myIds.has(u.id) ? currentUser : { ...(usersMap[u.id] || u), status: presence?.[u.id] ?? 'offline' }
      ),
    [memberUsers, usersMap, presence, myIds, currentUser]
  );

  return (
    <MemberList
      members={members}
      roles={currentServer?.roles || []}
      onSelectMember={(m) => openUserProfile(m.id)}
      currentUserId={currentUser.id}
    />
  );
}
