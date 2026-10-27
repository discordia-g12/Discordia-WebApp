import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  openChatSocket,
  type ChatRemovalReason,
  type ChatSocketConnection,
  type ChatSocketStatus,
} from '../realtime/chatSocket';
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
  /** El usuario ya no está en el servidor (ban o expulsión). La conexión no se reintenta. */
  onRemoved?: (reason: ChatRemovalReason) => void;
}

export interface UseChatSocketResult {
  isConnected: boolean;
  isConnecting: boolean;
  /** Estuvo conectado, se cortó y está volviendo: la interfaz muestra "reconectando". */
  isReconnecting: boolean;
  /** false si no puede escribir en el canal (silenciado o sin permiso): la interfaz deshabilita el input. */
  canSend: boolean;
  /** Distinto de null si lo sacaron del servidor: la conexión quedó cerrada para siempre. */
  removedReason: ChatRemovalReason | null;
  /** Envía un mensaje; rechaza si no hay conexión (espera si está conectando). */
  sendMessage: (content: string) => Promise<void>;
  /** Reconecta ya, sin esperar el backoff. */
  reconnect: () => void;
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
  onRemoved,
}: UseChatSocketOptions): UseChatSocketResult {
  const [status, setStatus] = useState<ChatSocketStatus>('closed');
  const [canSend, setCanSend] = useState(true);
  const [removedReason, setRemovedReason] = useState<ChatRemovalReason | null>(null);
  const connectionRef = useRef<ChatSocketConnection | null>(null);

  // Callbacks y último id en refs: cambiarlos no debe reconectar
  const handlersRef = useRef({ onMessage, onError, onReconnect, onRemoved });
  handlersRef.current = { onMessage, onError, onReconnect, onRemoved };
  const lastMessageIdRef = useRef(lastMessageIdSeen);
  lastMessageIdRef.current = lastMessageIdSeen;

  useEffect(() => {
    // Cada canal arranca de cero: permisos y cierre son de la conexión a ese canal
    setCanSend(true);
    setRemovedReason(null);
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
        onPermissionsChange: setCanSend,
        onRemoved: (reason) => {
          setRemovedReason(reason);
          handlersRef.current.onRemoved?.(reason);
        },
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
    canSend,
    removedReason,
    sendMessage,
    reconnect,
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
  options: {
    onRemoved?: (reason: ChatRemovalReason) => void;
    /** El servidor rechazó un mensaje (p. ej. le sacaron el permiso justo antes de enviarlo). */
    onError?: (message: string) => void;
  } = {}
) {
  const queryClient = useQueryClient();

  const { sendMessage, isConnected, isReconnecting, canSend, removedReason } = useChatSocket({
    channelId,
    userId,
    onError: options.onError,
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
    onRemoved: (reason) => {
      // Ya no es miembro: la lista de servidores tiene que dejar de mostrarlo
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      options.onRemoved?.(reason);
    },
  });

  return { sendMessageWs: sendMessage, isConnected, isReconnecting, canSend, removedReason };
}

/** Texto para mostrar cuando el chat cerró la conexión porque sacaron al usuario del servidor. */
export function chatRemovalMessage(reason: ChatRemovalReason): string {
  return reason === 'banned' ? 'Te banearon de este servidor.' : 'Ya no sos miembro de este servidor.';
}

/** Lo que muestra el input cuando Chat Engine dice que no puede escribir (mute o rol sin permiso). */
export const CHAT_MUTED_MESSAGE = 'Estás silenciado o no tenés permiso para escribir en este canal.';

/** Por qué no se puede escribir en el canal (reemplaza al input), o null si se puede. Igual en web y mobile. */
export function chatWriteBlockMessage(state: { canSend: boolean; removedReason: ChatRemovalReason | null }): string | null {
  if (state.removedReason) return chatRemovalMessage(state.removedReason);
  return state.canSend ? null : CHAT_MUTED_MESSAGE;
}
