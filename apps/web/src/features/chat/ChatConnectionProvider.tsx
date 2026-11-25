import type { ReactNode } from 'react';
import { chatRemovalMessage, useChatWebSocket, useInbox } from '@discordia/core';
import { showToast, useUIStore } from '../../app/uiStore';
import { usePageVisible } from '../../app/usePageVisible';
import { selectServer } from '../servers/serverActions';
import { useCurrentUser } from '../profile/currentUserStore';
import { ChatConnectionContext } from './chatConnectionContext';
import { publishIncomingNotification } from '../notifications/useAppNotificationAlerts';

/**
 * WebSocket del canal seleccionado, uno solo para toda la app: sigue conectado aunque se abran los
 * ajustes o el perfil, y lo que llega va al caché de mensajes de React Query. Si sacan al usuario del
 * servidor (ban o expulsión), avisa y vuelve al inicio; el chat no reintenta. Acá también se monta el
 * socket inbox, el de los mensajes directos: uno por sesión, abierto aunque se esté mirando un servidor.
 */
export function ChatConnectionProvider({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const readingChannelId = useUIStore((s) => s.readingChannelId);
  const pageVisible = usePageVisible();
  // Los avisos en vivo van a NotificationAlerts (sonido y aviso de escritorio), que tiene los nombres
  useInbox({ activeConversationId: pageVisible ? readingChannelId : null, onNotification: publishIncomingNotification });

  const { sendMessageWs, isReconnecting, canSend, removedReason } = useChatWebSocket(
    selectedServerId !== 'home' && selectedChannelId ? selectedChannelId : null,
    currentUser.id,
    {
      onRemoved: (reason) => {
        showToast(chatRemovalMessage(reason), 'danger');
        // Servidor suspendido: sigue siendo miembro, se queda en el servidor y ve el aviso (la lista se recarga
        // sola en useChatWebSocket y marca isSuspended). Ban / expulsión: el servidor ya no está, vuelve al inicio
        if (reason !== 'server-suspended') selectServer('home', []);
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
