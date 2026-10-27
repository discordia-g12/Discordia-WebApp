import { createContext, useContext } from 'react';

type SendMessage = (content: string) => Promise<void>;

interface ChatConnection {
  send: SendMessage;
  /** La conexión del canal se cortó y está volviendo. */
  isReconnecting: boolean;
  /** Puede escribir en el canal (lo informa el chat: SEND_MESSAGES y sin silenciamiento). */
  canSend: boolean;
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

/**
 * false si el usuario no puede escribir en el canal seleccionado (sin permiso o silenciado). Fuera del
 * provider (DMs, tests de la vista) se puede escribir.
 */
export function useChatCanSend(): boolean {
  return useContext(ChatConnectionContext)?.canSend ?? true;
}
