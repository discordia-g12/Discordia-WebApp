import { useMemo } from 'react';
import { useServerMembersQuery, useServersQuery } from '@discordia/core';
import type { Server, Status, User } from '../../types';
import { useUIStore } from '../../app/uiStore';

const NO_SERVERS: Server[] = [];

/** Últimos 4 caracteres del id: nombre provisorio de un usuario sin perfil cargado. */
export function shortUserId(userId: string) {
  return userId.substring(userId.length - 4);
}

/** Usuario a mostrar cuando todavía no llegó su perfil. */
export function placeholderUser(userId: string): User {
  return {
    id: userId,
    username: userId,
    displayName: `User ${shortUserId(userId)}`,
    status: 'online' as Status,
  };
}

/**
 * Servidores del usuario y el servidor / canal seleccionados (los datos vienen de React Query; la
 * selección, de useUIStore).
 */
export function useCurrentServer() {
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const { data, isLoading: isLoadingServers } = useServersQuery();
  const servers = data ?? NO_SERVERS;

  const currentServer = useMemo(() => {
    if (selectedServerId === 'home') return null;
    return servers.find((s) => s.id === selectedServerId) || null;
  }, [servers, selectedServerId]);

  const allServerChannels = useMemo(() => {
    if (!currentServer) return [];
    return currentServer.categories.flatMap((cat) => cat.channels);
  }, [currentServer]);

  const currentChannel = useMemo(() => {
    if (!selectedChannelId) return null;
    return allServerChannels.find((ch) => ch.id === selectedChannelId) || null;
  }, [allServerChannels, selectedChannelId]);

  return { servers, isLoadingServers, currentServer, allServerChannels, currentChannel };
}

/** Miembros del servidor seleccionado como usuarios (con nombre provisorio hasta tener el perfil). */
export function useServerMemberUsers(): User[] {
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const { data } = useServerMembersQuery(selectedServerId === 'home' ? null : selectedServerId);

  return useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((p) => p.items).map((m) => ({
      id: m.userId,
      username: m.userId,
      displayName: m.nickname || `User ${shortUserId(m.userId)}`,
      roleIds: m.roleIds,
      status: 'online' as Status,
      avatar: undefined,
    }));
  }, [data]);
}
