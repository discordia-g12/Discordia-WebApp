import { useEffect, useMemo } from 'react';
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

/**
 * Mantiene un canal válido elegido: si hay un servidor abierto y el canal seleccionado no es suyo (recién
 * creado o unido, el canal se borró, o el servidor no tenía canales de texto y se creó el primero), elige
 * su primer canal de texto y muestra el chat. Sin esto el chat quedaba sin canal hasta tocar uno a mano.
 */
export function useEnsureChannelSelected() {
  const { currentServer, currentChannel, allServerChannels } = useCurrentServer();

  useEffect(() => {
    if (!currentServer || currentChannel) return;
    const firstText = allServerChannels.find((ch) => ch.type === 'text');
    if (!firstText) return;
    const ui = useUIStore.getState();
    ui.setSelectedChannelId(firstText.id);
    // La vista de voz sin canal válido tampoco sirve: vuelve al chat
    if (ui.appView === 'voice' || ui.appView === 'home') ui.setAppView('chat');
  }, [currentServer, currentChannel, allServerChannels]);
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
