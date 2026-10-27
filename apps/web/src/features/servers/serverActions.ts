import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  getInvitePreview,
  imageUploadErrorMessage,
  joinServerViaInvite,
  removeServerIcon,
  updateServerIcon,
  useCreateServerMutation,
} from '@discordia/core';
import type { Server } from '../../types';
import { showToast, useUIStore } from '../../app/uiStore';

/** Errores de Server-Roles que solo pueden venir del ícono (el nombre inválido es 422). */
const ICON_ERROR_STATUSES = new Set([400, 413, 503]);

/** Crea un servidor (con su ícono, si se eligió) y lo selecciona. Si falla, el modal queda abierto. */
export function useCreateServer() {
  const createServerMutation = useCreateServerMutation();

  return async (name: string, icon?: File) => {
    try {
      const newServer = await createServerMutation.mutateAsync(icon ? { name, icon } : { name });
      // Abre el servidor con su primer canal de texto (•general)
      selectServer(newServer.id, [newServer]);
      useUIStore.getState().setActiveModal(null);
      showToast('Servidor creado', 'success');
    } catch (err) {
      // Si el ícono falla, el servidor no se crea (Server-Roles sube el ícono antes de crearlo)
      const iconFailed = icon && err instanceof ApiError && ICON_ERROR_STATUSES.has(err.status);
      showToast(iconFailed ? imageUploadErrorMessage(err) : 'Error al crear el servidor', 'danger');
    }
  };
}

/** Código de una invitación a partir de lo que se pegó: el enlace entero o solo el código. */
export function inviteCodeFrom(invite: string): string {
  const trimmed = invite.trim().replace(/\/+$/, '');
  return trimmed.split('/').pop() || trimmed;
}

/** Saca /invite/<código> de la barra de direcciones (después de usar o descartar la invitación). */
export function clearInviteFromUrl() {
  if (window.location.pathname.startsWith('/invite/')) {
    window.history.replaceState({}, document.title, '/');
  }
}

/**
 * Se une a un servidor con una invitación y actualiza la lista de servidores. Si falla, rechaza con el
 * mensaje para mostrar.
 */
export function useJoinServer() {
  const queryClient = useQueryClient();

  return async (invite: string) => {
    let serverId: string;
    try {
      ({ server_id: serverId } = await joinServerViaInvite(inviteCodeFrom(invite)));
    } catch {
      throw new Error('La invitación no es válida o ya venció.');
    }
    await queryClient.invalidateQueries({ queryKey: ['servers'] });
    clearInviteFromUrl();
    // Abre el servidor al que se unió (useEnsureChannelSelected elige su primer canal de texto)
    useUIStore.getState().setSelectedServerId(serverId);
    useUIStore.getState().setAppView('chat');
    showToast('Te uniste al servidor', 'success');
  };
}

export interface InvitePreview {
  name: string;
  description?: string;
  iconUrl?: string;
  memberCount?: number;
}

/** Vista previa del servidor de una invitación, mientras se escribe (espera medio segundo sin cambios). */
export function useInvitePreview(invite: string): InvitePreview | null {
  const [preview, setPreview] = useState<InvitePreview | null>(null);

  useEffect(() => {
    const code = inviteCodeFrom(invite);
    if (code.length < 3) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const timeout = setTimeout(() => {
      getInvitePreview(code)
        .then((data) => {
          if (cancelled) return;
          setPreview({
            name: data.server_name,
            description: data.server_description || undefined,
            iconUrl: data.server_icon || undefined,
            memberCount: data.member_count,
          });
        })
        .catch(() => !cancelled && setPreview(null));
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [invite]);

  return preview;
}

/**
 * Cambia o quita el ícono de un servidor y aplica en el caché la URL que devuelve la API (la anterior deja
 * de existir). Si falla, rechaza con el error de la API.
 */
export function useServerIcon() {
  const queryClient = useQueryClient();

  const apply = (updated: Server) => {
    queryClient.setQueryData<Server[]>(['servers'], (prev = []) =>
      prev.map((s) => (s.id === updated.id ? { ...s, iconUrl: updated.iconUrl, icon: updated.icon } : s))
    );
    return updated.iconUrl;
  };

  return {
    change: async (serverId: string, icon: File) => apply(await updateServerIcon(serverId, icon)),
    remove: async (serverId: string) => apply(await removeServerIcon(serverId)),
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
