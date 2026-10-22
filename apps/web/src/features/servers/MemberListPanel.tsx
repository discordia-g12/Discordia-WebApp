import { useUsers } from '../../app/UsersProvider';
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

  return (
    <MemberList
      members={memberUsers.map((u) => usersMap[u.id] || u)}
      roles={currentServer?.roles || []}
      onSelectMember={(m) => openUserProfile(m.id)}
      currentUserId={currentUser.id}
    />
  );
}
