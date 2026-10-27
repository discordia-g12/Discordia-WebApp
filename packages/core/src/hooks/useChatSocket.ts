import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { openChatSocket, type ChatSocketConnection, type ChatSocketStatus } from '../realtime/chatSocket';
import type { Message, MessageBackendPayload } from '../types';
import { normalizeMessage } from '../api/messages';

export interface UseChatSocketOptions {
  /** Canal al que conectarse; null para no conectar (p. ej. DMs, que todavía no van por el backend). */
  channelId: string | null;
  userId: string;
  /** Último mensaje que la app ya tiene; el servidor reenvía los posteriores al (re)conectar. */
  lastMessageIdSeen?: string;
  onMessage: (message: MessageBackendPayload) => void;
  onError?: (message: string) => void;
  onReconnect?: () => void;
}

export interface UseChatSocketResult {
  isConnected: boolean;
  isConnecting: boolean;
  /** Estuvo conectado, se cortó y está volviendo: la interfaz muestra "reconectando". */
  isReconnecting: boolean;
  /** Envía un mensaje; rechaza si no hay conexión (espera si está conectando). */
  sendMessage: (content: string) => Promise<void>;
  /** Reconecta ya, sin esperar el backoff. */
  reconnect: () => void;
  /** Puede escribir en el canal (tiene SEND_MESSAGES y no está silenciado). Lo informa el servidor. */
  canSend: boolean;
}

/**
 * Chat en tiempo real de un canal (web y mobile). La conexión, la reconexión y la recuperación de
 * mensajes están en realtime/chatSocket.ts; cada app decide dónde guarda lo que llega (onMessage).
 */
export function useChatSocket({
  channelId,
  userId,
  lastMessageIdSeen,
  onMessage,
  onError,
  onReconnect,
}: UseChatSocketOptions): UseChatSocketResult {
  const [status, setStatus] = useState<ChatSocketStatus>('closed');
  // Lo último que informó el servidor, con el canal al que se refiere: en otro canal (o sin canal) vale true
  const [sendPermission, setSendPermission] = useState<{ channelId: string; canSend: boolean } | null>(null);
  const connectionRef = useRef<ChatSocketConnection | null>(null);

  // Callbacks y último id en refs: cambiarlos no debe reconectar
  const handlersRef = useRef({ onMessage, onError, onReconnect });
  handlersRef.current = { onMessage, onError, onReconnect };
  const lastMessageIdRef = useRef(lastMessageIdSeen);
  lastMessageIdRef.current = lastMessageIdSeen;

  useEffect(() => {
    if (!channelId || !userId) return;

    const connection = openChatSocket(
      channelId,
      {
        onMessage: (message) => handlersRef.current.onMessage(message),
        onError: handlersRef.current.onError
          ? (message) => handlersRef.current.onError?.(message)
          : undefined,
        onReconnect: () => handlersRef.current.onReconnect?.(),
        onStatusChange: setStatus,
        onPermissionsUpdated: (canSend) => setSendPermission({ channelId, canSend }),
      },
      { getLastMessageIdSeen: () => lastMessageIdRef.current }
    );
    connectionRef.current = connection;

    return () => {
      connection.close();
      if (connectionRef.current === connection) connectionRef.current = null;
    };
  }, [channelId, userId]);

  const sendMessage = useCallback(
    async (content: string) => {
      const connection = connectionRef.current;
      if (!connection) throw new Error('WebSocket not initialized');
      await connection.send(content, userId);
    },
    [userId]
  );

  const reconnect = useCallback(() => connectionRef.current?.reconnect(), []);

  return {
    isConnected: status === 'open',
    isConnecting: status === 'connecting' || status === 'reconnecting',
    isReconnecting: status === 'reconnecting',
    sendMessage,
    reconnect,
    canSend: sendPermission?.channelId !== channelId || sendPermission.canSend,
  };
}

/**
 * Chat en tiempo real integrado con React Query: lo que llega se agrega al caché de
 * ['messages', channelId] (el mismo de useChannelMessagesQuery) y, después de un corte, se vuelve a
 * pedir el historial. El autor de cada mensaje se resuelve en la UI por authorId.
 */
export function useChatWebSocket(
  channelId: string | null,
  userId: string,
  onError?: (message: string) => void
) {
  const queryClient = useQueryClient();

  const { sendMessage, isConnected, isReconnecting, canSend } = useChatSocket({
    channelId,
    userId,
    onError,
    onMessage: (data) => {
      queryClient.setQueriesData(
        { queryKey: ['messages', channelId] },
        (old: Message[] | undefined) => {
          const message = normalizeMessage(data as unknown as Message);
          if (!old) return [message];
          // Evitar duplicados
          if (old.some((m) => m.id === message.id)) return old;
          return [...old, message];
        }
      );
    },
    onReconnect: () => {
      // Reconexión: los mensajes enviados durante el corte no llegaron por el socket
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });

  return { sendMessageWs: sendMessage, isConnected, isReconnecting, canSend };
}
