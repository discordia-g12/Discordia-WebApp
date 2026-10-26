import type { ReactNode } from 'react';
import { useChatWebSocket } from '@discordia/core';
import { useUIStore } from '../../app/uiStore';
import { useCurrentUser } from '../profile/currentUserStore';
import { ChatConnectionContext } from './chatConnectionContext';

/**
 * WebSocket del canal seleccionado, uno solo para toda la app: sigue conectado aunque se abran los
 * ajustes o el perfil, y lo que llega va al caché de mensajes de React Query.
 */
export function ChatConnectionProvider({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const { sendMessageWs, isReconnecting } = useChatWebSocket(
    selectedServerId !== 'home' && selectedChannelId ? selectedChannelId : null,
    currentUser.id
  );

  return (
    <ChatConnectionContext.Provider value={{ send: sendMessageWs, isReconnecting }}>{children}</ChatConnectionContext.Provider>
  );
}
