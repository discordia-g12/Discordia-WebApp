import { useQueryClient } from '@tanstack/react-query';
import { useCreateServerMutation } from '@discordia/core';
import type { Server } from '../../types';
import { showToast, useUIStore } from '../../app/uiStore';

/** Crea un servidor y lo selecciona. */
export function useCreateServer() {
  const createServerMutation = useCreateServerMutation();

  return async (name: string, icon?: string | File) => {
    try {
      const newServer = await createServerMutation.mutateAsync({
        name,
        icon: icon instanceof File ? icon : undefined,
      });
      useUIStore.getState().setSelectedServerId(newServer.id);
      useUIStore.getState().setActiveModal(null);
      showToast('Servidor creado', 'success');
    } catch (error) {
      showToast('Error al crear el servidor', 'danger');
    }
  };
}

/** Aplica en el caché la configuración guardada desde los ajustes del servidor. */
export function useUpdateServer() {
  const queryClient = useQueryClient();

  return (updatedServer: Server) => {
    queryClient.setQueryData<Server[]>(['servers'], (prev = []) =>
      prev.map((s) => (s.id === updatedServer.id ? updatedServer : s))
    );
    showToast('Configuración del servidor guardada', 'success');
  };
}

/** Selecciona un servidor (y su primer canal de texto) o el inicio. */
export function selectServer(serverId: string | 'home', servers: Server[]) {
  const ui = useUIStore.getState();
  ui.setSelectedServerId(serverId);
  if (serverId === 'home') {
    ui.setAppView('home');
    ui.setSelectedDmId(null);
  } else {
    const srv = servers.find((s) => s.id === serverId);
    if (srv) {
      const firstTextChannel = srv.categories
        .flatMap((c) => c.channels)
        .find((ch) => ch.type === 'text');
      ui.setSelectedChannelId(firstTextChannel?.id || null);
      ui.setAppView('chat');
    }
  }
}
