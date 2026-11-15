import { useMemo, type ReactNode } from 'react';
import { useChannelMessagesQuery, useConversationsQuery, useSession, useUserProfiles } from '@discordia/core';
import type { User } from '../types';
import { useUIStore } from './uiStore';
import { useCurrentUser } from '../features/profile/currentUserStore';
import { useVoice } from '../features/voice/voiceContext';
import { UsersContext } from './usersContext';
import { placeholderUser, useServerMemberUsers } from '../features/servers/useCurrentServer';

/**
 * Perfiles de todos los usuarios que aparecen en pantalla (miembros, DMs, autores de mensajes y
 * participantes de voz), pedidos una sola vez para toda la app.
 */
export function UsersProvider({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const linkedUserId = useSession((s) => s.profile?.user_id);
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const selectedDm = useUIStore((s) => s.selectedDm);
  const { data: conversations } = useConversationsQuery();
  const memberUsers = useServerMemberUsers();
  const { room, presence } = useVoice();
  const { data: realMessages } = useChannelMessagesQuery(selectedServerId !== 'home' ? selectedChannelId : null);

  const fetchedUsers = useUserProfiles(
    [
      ...memberUsers.map((u) => u.id),
      ...(conversations ?? []).map((conversation) => conversation.otherUserId),
      ...(selectedDm?.type === 'chat' ? [selectedDm.userId] : []),
      ...(realMessages ?? []).map((msg) => msg.authorId),
      ...room.participants.map((p) => p.id),
      ...Object.values(presence).flat(),
    ].filter((id) => id !== currentUser.id && id !== linkedUserId)
  );

  const usersMap = useMemo(() => {
    const map: Record<string, User> = { ...fetchedUsers };

    // Fallback: Si no esta en fetchedUsers todavia, usar la info incompleta de miembros
    memberUsers.forEach((u) => {
      if (!map[u.id]) {
        map[u.id] = u;
      }
    });

    map[currentUser.id] = currentUser;
    if (linkedUserId) {
      map[linkedUserId] = currentUser;
    }
    return map;
  }, [fetchedUsers, memberUsers, currentUser, linkedUserId]);

  const value = useMemo(
    () => ({ usersMap, userOrFallback: (id: string) => usersMap[id] || placeholderUser(id) }),
    [usersMap]
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}
