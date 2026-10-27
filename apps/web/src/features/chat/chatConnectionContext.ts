import { createContext, useContext } from 'react';
import { chatWriteBlockMessage, type ChatRemovalReason } from '@discordia/core';

type SendMessage = (content: string) => Promise<void>;

interface ChatConnection {
  send: SendMessage;
  /** La conexión del canal se cortó y está volviendo. */
  isReconnecting: boolean;
  /** false si no puede escribir en el canal (silenciado o sin permiso). */
  canSend: boolean;
  /** Distinto de null si lo sacaron del servidor: el chat quedó cerrado. */
  removedReason: ChatRemovalReason | null;
}

export const ChatConnectionContext = createContext<ChatConnection | null>(null);

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

/** Texto que reemplaza al input del canal si no se puede escribir; null si se puede. */
export function useChatWriteBlock(): string | null {
  return chatWriteBlockMessage(useChatConnection());
}
