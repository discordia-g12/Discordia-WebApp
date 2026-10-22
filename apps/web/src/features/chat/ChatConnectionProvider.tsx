import { createContext, useContext, type ReactNode } from 'react';
import { useChatWebSocket } from '@discordia/core';
import { useUIStore } from '../../app/uiStore';
import { useCurrentUser } from '../profile/currentUserStore';

type SendMessage = (content: string) => Promise<void>;

const ChatConnectionContext = createContext<SendMessage | null>(null);

/**
 * WebSocket del canal seleccionado, uno solo para toda la app: sigue conectado aunque se abran los
 * ajustes o el perfil, y lo que llega va al caché de mensajes de React Query.
 */
export function ChatConnectionProvider({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const selectedServerId = useUIStore((s) => s.selectedServerId);
  const selectedChannelId = useUIStore((s) => s.selectedChannelId);
  const { sendMessageWs } = useChatWebSocket(
    selectedServerId !== 'home' && selectedChannelId ? selectedChannelId : null,
    currentUser.id
  );

  return <ChatConnectionContext.Provider value={sendMessageWs}>{children}</ChatConnectionContext.Provider>;
}

/** Envía un mensaje al canal seleccionado por el WebSocket. */
export function useSendChannelMessage(): SendMessage {
  const send = useContext(ChatConnectionContext);
  if (!send) throw new Error('useSendChannelMessage debe usarse dentro de <ChatConnectionProvider>');
  return send;
}
