import { createContext, useContext, type ReactNode } from 'react';
import { useChatWebSocket } from '@discordia/core';
import { useUIStore } from '../../app/uiStore';
import { useCurrentUser } from '../profile/currentUserStore';

type SendMessage = (content: string) => Promise<void>;

interface ChatConnection {
  send: SendMessage;
  /** La conexión del canal se cortó y está volviendo. */
  isReconnecting: boolean;
}

const ChatConnectionContext = createContext<ChatConnection | null>(null);

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

function useChatConnection(): ChatConnection {
  const connection = useContext(ChatConnectionContext);
  if (!connection) throw new Error('useChatConnection debe usarse dentro de <ChatConnectionProvider>');
  return connection;
}

/** Envía un mensaje al canal seleccionado por el WebSocket. */
export function useSendChannelMessage(): SendMessage {
  return useChatConnection().send;
}

/** true mientras el chat del canal está reconectando después de un corte. */
export function useChatReconnecting(): boolean {
  return useChatConnection().isReconnecting;
}
