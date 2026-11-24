import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  openChatSocket,
  type ChatRemovalReason,
  type ChatSocketConnection,
  type ChatSocketStatus,
  type ThreadReplyEvent,
} from '../realtime/chatSocket';
import type { Message, MessageAttachment, MessageBackendPayload } from '../types';
import { normalizeMessage } from '../api/messages';
import {
  appendMessage,
  applyThreadReply,
  markCachedMessageDeleted,
  mergeCachedMessage,
  pinnedMessagesQueryKey,
  messagesQueryKey,
  type MessagePages,
} from './messageCache';

export interface UseChatSocketOptions {
  /** Canal o conversación (`dm-…`) al que conectarse; null para no conectar. */
  channelId: string | null;
  userId: string;
  /** Último mensaje que la app ya tiene; el servidor reenvía los posteriores al (re)conectar. */
  lastMessageIdSeen?: string;
  onMessage: (message: MessageBackendPayload) => void;
  /** Una respuesta nueva en un hilo de este canal. */
  onThreadReply?: (event: ThreadReplyEvent) => void;
  /** Un mensaje existente fue editado en este canal. */
  onMessageUpdated?: (message: MessageBackendPayload) => void;
  /** Un mensaje existente fue eliminado en este canal. */
  onMessageDeleted?: (message: MessageBackendPayload) => void;
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
  sendMessage: (content: string, attachments?: MessageAttachment[], replyToId?: string) => Promise<void>;
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
  onThreadReply,
  onMessageUpdated,
  onMessageDeleted,
  onError,
  onReconnect,
  onRemoved,
}: UseChatSocketOptions): UseChatSocketResult {
  const [status, setStatus] = useState<ChatSocketStatus>('closed');
  const [canSend, setCanSend] = useState(true);
  const [removedReason, setRemovedReason] = useState<ChatRemovalReason | null>(null);
  const connectionRef = useRef<ChatSocketConnection | null>(null);

  // Callbacks y último id en refs: cambiarlos no debe reconectar
  const handlersRef = useRef({ onMessage, onThreadReply, onMessageUpdated, onMessageDeleted, onError, onReconnect, onRemoved });
  handlersRef.current = { onMessage, onThreadReply, onMessageUpdated, onMessageDeleted, onError, onReconnect, onRemoved };
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
        onThreadReply: (event) => handlersRef.current.onThreadReply?.(event),
        onMessageUpdated: (message) => handlersRef.current.onMessageUpdated?.(message),
        onMessageDeleted: (message) => handlersRef.current.onMessageDeleted?.(message),
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
    async (content: string, attachments?: MessageAttachment[], replyToId?: string) => {
      const connection = connectionRef.current;
      if (!connection) throw new Error('WebSocket not initialized');
      await connection.send(content, userId, attachments, replyToId);
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
 * Chat en tiempo real integrado con React Query: lo que llega se agrega a la página más nueva del caché
 * ['messages', channelId] (el mismo de useChannelMessagesQuery) y, después de un corte, se vuelven a
 * pedir las páginas cargadas. El autor de cada mensaje se resuelve en la UI por authorId.
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
      // Si el historial todavía no cargó, no se toca: cuando llegue ya va a traer este mensaje
      queryClient.setQueryData<MessagePages>(messagesQueryKey(channelId), (old) =>
        appendMessage(old, normalizeMessage(data as unknown as Message))
      );
    },
    onThreadReply: ({ parentId, reply, thread }) => {
      if (channelId) {
        applyThreadReply(queryClient, channelId, parentId, normalizeMessage(reply as unknown as Message), thread);
      }
    },
    onMessageUpdated: (data) => {
      // Edición, reacción o fijado: actualiza el historial y la lista de fijados
      if (channelId) mergeCachedMessage(queryClient, channelId, normalizeMessage(data as unknown as Message));
    },
    onMessageDeleted: (data) => {
      if (channelId) markCachedMessageDeleted(queryClient, channelId, normalizeMessage(data as unknown as Message));
    },
    onReconnect: () => {
      // Reconexión: los mensajes enviados durante el corte no llegaron por el socket, ni los fijados de mensajes viejos
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      queryClient.invalidateQueries({ queryKey: pinnedMessagesQueryKey(channelId) });
      // Las respuestas de los hilos abiertos tampoco (la reconexión del canal no las repone)
      queryClient.invalidateQueries({ queryKey: ['thread', channelId] });
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
  if (reason === 'banned') return 'Te banearon de este servidor.';
  if (reason === 'server-suspended') return 'La plataforma suspendió este servidor.';
  if (reason === 'server-deleted') return 'Este servidor fue eliminado.';
  return 'Ya no sos miembro de este servidor.';
}

/** Lo que muestra el input cuando Chat Engine dice que no puede escribir (mute o rol sin permiso). */
export const CHAT_MUTED_MESSAGE = 'Estás silenciado o no tenés permiso para escribir en este canal.';

/** Por qué no se puede escribir en el canal (reemplaza al input), o null si se puede. Igual en web y mobile. */
export function chatWriteBlockMessage(state: { canSend: boolean; removedReason: ChatRemovalReason | null }): string | null {
  if (state.removedReason) return chatRemovalMessage(state.removedReason);
  return state.canSend ? null : CHAT_MUTED_MESSAGE;
}
