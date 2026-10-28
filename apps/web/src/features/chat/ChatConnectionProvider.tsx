import type { ReactNode } from 'react';
import { chatRemovalMessage, useChatWebSocket } from '@discordia/core';
import { showToast, useUIStore } from '../../app/uiStore';
import { selectServer } from '../servers/serverActions';
import { useCurrentUser } from '../profile/currentUserStore';
import { ChatConnectionContext } from './chatConnectionContext';

/**
 * WebSocket del canal seleccionado, uno solo para toda la app: sigue conectado aunque se abran los
 * ajustes o el perfil, y lo que llega va al caché de mensajes de React Query. Si sacan al usuario del
 * servidor (ban o expulsión), avisa y vuelve al inicio; el chat no reintenta.
 */
export function ChatConnectionProvider({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const { sendMessageWs, isReconnecting, canSend, removedReason } = useChatWebSocket(
    selectedServerId !== 'home' && selectedChannelId ? selectedChannelId : null,
    currentUser.id,
    {
      onRemoved: (reason) => {
        showToast(chatRemovalMessage(reason), 'danger');
        selectServer('home', []);
      },
      // El servidor rechazó el mensaje (p. ej. le sacaron el permiso justo antes de enviarlo)
      onError: (error) => showToast(`No se pudo enviar el mensaje: ${error}`, 'danger'),
    }
  );

  return (
    <ChatConnectionContext.Provider value={{ send: sendMessageWs, isReconnecting, canSend, removedReason }}>
      {children}
    </ChatConnectionContext.Provider>
  );
}
