import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useChannelMessagesQuery, useUserProfiles } from '@discordia/core';
import type { User } from '../types';
import { useUIStore } from './uiStore';
import { useCurrentUser } from '../features/profile/currentUserStore';
import { useDmStore } from '../features/friends/dmStore';
import { useVoice } from '../features/voice/VoiceProvider';
import { placeholderUser, useServerMemberUsers } from '../features/servers/useCurrentServer';

interface UsersContextValue {
  /** Usuarios conocidos por id: perfiles cargados, miembros sin perfil todavía y el propio. */
  usersMap: Record<string, User>;
  /** El usuario, o uno provisorio si todavía no llegó su perfil. */
  userOrFallback: (id: string) => User;
}

const UsersContext = createContext<UsersContextValue | null>(null);

/**
 * Perfiles de todos los usuarios que aparecen en pantalla (miembros, DMs, autores de mensajes y
 * participantes de voz), pedidos una sola vez para toda la app.
 */
export function UsersProvider({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const directMessages = useDmStore((s) => s.directMessages);
  const memberUsers = useServerMemberUsers();
  const { room, presence } = useVoice();
  const { data: realMessages } = useChannelMessagesQuery(selectedServerId !== 'home' ? selectedChannelId : null);

  const fetchedUsers = useUserProfiles(
    [
      ...memberUsers.map((u) => u.id),
      ...directMessages.map((dm) => dm.recipientId || dm.userId || ''),
      ...(realMessages ?? []).map((msg) => msg.authorId),
      ...room.participants.map((p) => p.id),
      ...Object.values(presence).flat(),
    ].filter((id) => id !== currentUser.id)
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
    return map;
  }, [fetchedUsers, memberUsers, currentUser]);

  const value = useMemo(
    () => ({ usersMap, userOrFallback: (id: string) => usersMap[id] || placeholderUser(id) }),
    [usersMap]
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers(): UsersContextValue {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsers debe usarse dentro de <UsersProvider>');
  return ctx;
}
