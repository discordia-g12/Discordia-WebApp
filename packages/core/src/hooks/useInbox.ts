import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isConversationId } from '../api/conversations';
import { normalizeMessage } from '../api/messages';
import { useSession } from '../auth/session';
import { isCallInboxEvent, publishCallEvent, publishInboxReconnect } from '../realtime/callEvents';
import {
  openInboxSocket,
  type InboxEvent,
  type InboxSocketConnection,
  type InboxSocketStatus,
} from '../realtime/inboxSocket';
import type { Conversation, Message } from '../types';
import {
  applyConversationMessage,
  conversationsQueryKey,
  conversationWithQueryKey,
  upsertConversation,
} from './inboxCache';
import {
  appendMessage,
  markCachedMessageDeleted,
  mergeCachedMessage,
  messagesQueryKey,
  type MessagePages,
} from './messageCache';

export interface UseInboxOptions {
  /** La conversación abierta: lo que llega ahí no suma no leídos. */
  activeConversationId?: string | null;
  /** false para soltar la conexión (p. ej. la app en segundo plano); al volver a true, refresca. */
  enabled?: boolean;
  /** Callback opcional cuando cambia la configuración de un servidor (mobile lo usa para refrescar su estado local). */
  onServerUpdated?: (serverId: string) => void;
  /** Callback opcional cuando se elimina un servidor (mobile lo usa para sacarlo y cerrar vistas activas). */
  onServerDeleted?: (serverId: string) => void;
}

/**
 * Socket del usuario: mete lo que llega en el caché de conversaciones y de mensajes. Se monta una sola vez
 * por sesión. Al reconectar, o al volver de `enabled` en false, pide de nuevo las conversaciones. Los eventos
 * de llamadas no los toca: los reenvía a subscribeCallEvents (los usa usePrivateCall).
 */
export function useInbox({
  activeConversationId = null,
  enabled = true,
  onServerUpdated,
  onServerDeleted,
}: UseInboxOptions = {}) {
  const queryClient = useQueryClient();
  const sessionStatus = useSession((s) => s.status);
  const [status, setStatus] = useState<InboxSocketStatus>('closed');
  const connectionRef = useRef<InboxSocketConnection | null>(null);
  const hasOpenedRef = useRef(false);

  // En un ref: abrir otra conversación no debe reconectar
  const activeRef = useRef(activeConversationId);
  activeRef.current = activeConversationId;
  const serverCallbacksRef = useRef({ onServerUpdated, onServerDeleted });
  serverCallbacksRef.current = { onServerUpdated, onServerDeleted };

  const active = enabled && sessionStatus === 'authenticated';

  useEffect(() => {
    if (!active) return;

    const handleEvent = (event: InboxEvent) => {
      // Llamadas privadas: las procesa usePrivateCall
      if (isCallInboxEvent(event)) {
        publishCallEvent(event);
        return;
      }

      // Otro miembro cambió la configuración del servidor: se vuelve a pedir la lista (barra de servidores,
      // encabezado y ajustes leen de ahí). El evento solo trae el id, los datos los da la API
      if (event.type === 'SERVER_UPDATED') {
        queryClient.invalidateQueries({ queryKey: ['servers'] });
        serverCallbacksRef.current.onServerUpdated?.(event.serverId);
        return;
      }

      if (event.type === 'SERVER_DELETED') {
        queryClient.invalidateQueries({ queryKey: ['servers'] });
        serverCallbacksRef.current.onServerDeleted?.(event.serverId);
        return;
      }

      if (event.type === 'DM_CONVERSATION') {
        const { conversation } = event;
        queryClient.setQueryData<Conversation[]>(conversationsQueryKey, (old) => upsertConversation(old, conversation));
        queryClient.invalidateQueries({ queryKey: conversationWithQueryKey(conversation.otherUserId) });
        return;
      }

      if (event.type === 'DM_MESSAGE_UPDATED') {
        const { conversationId } = event;
        const message = normalizeMessage(event.message as unknown as Message);
        mergeCachedMessage(queryClient, conversationId, message);
        const conversations = queryClient.getQueryData<Conversation[]>(conversationsQueryKey);
        if (conversations?.some((c) => c.id === conversationId)) {
          queryClient.setQueryData<Conversation[]>(
            conversationsQueryKey,
            conversations.map((c) => {
              if (c.id !== conversationId || c.lastMessage?.createdAt !== (message.createdAt ?? message.timestamp)) {
                return c;
              }
              return {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  content: message.content,
                },
              };
            })
          );
        }
        return;
      }

      if (event.type === 'DM_MESSAGE_DELETED') {
        const { conversationId } = event;
        const message = normalizeMessage(event.message as unknown as Message);
        markCachedMessageDeleted(queryClient, conversationId, message);
        const conversations = queryClient.getQueryData<Conversation[]>(conversationsQueryKey);
        if (conversations?.some((c) => c.id === conversationId)) {
          queryClient.setQueryData<Conversation[]>(
            conversationsQueryKey,
            conversations.map((c) => {
              if (c.id !== conversationId || c.lastMessage?.createdAt !== (message.createdAt ?? message.timestamp)) {
                return c;
              }
              return {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  content: '/ este mensaje fue eliminado',
                },
              };
            })
          );
        }
        return;
      }

      if (event.type === 'DM_MESSAGE_REACTION_UPDATED') {
        const { conversationId } = event;
        mergeCachedMessage(queryClient, conversationId, normalizeMessage(event.message as unknown as Message));
        return;
      }

      const { conversationId } = event;
      const message = normalizeMessage(event.message as unknown as Message);
      // Si el historial no cargó, no se toca. Si la conversación está abierta, el mensaje puede llegar también
      // por su socket: appendMessage no lo repite
      queryClient.setQueryData<MessagePages>(messagesQueryKey(conversationId), (old) => appendMessage(old, message));

      const conversations = queryClient.getQueryData<Conversation[]>(conversationsQueryKey);
      if (conversations?.some((c) => c.id === conversationId)) {
        queryClient.setQueryData<Conversation[]>(
          conversationsQueryKey,
          applyConversationMessage(conversations, conversationId, message, activeRef.current)
        );
      } else {
        // Conversación nueva: el evento no trae quién es el otro
        queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      }
    };

    const connection = openInboxSocket({
      onEvent: handleEvent,
      onStatusChange: (next) => {
        setStatus(next);
        if (next !== 'open') return;
        if (hasOpenedRef.current) {
          queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
          // Lo que llegó durante el corte no pasó por el socket: el historial de los DMs ya cargados quedó viejo
          queryClient.invalidateQueries({
            predicate: ({ queryKey: [scope, id] }) => scope === 'messages' && isConversationId(id as string),
          });
          publishInboxReconnect();
        }
        hasOpenedRef.current = true;
      },
    });
    connectionRef.current = connection;

    return () => {
      connection.close();
      if (connectionRef.current === connection) connectionRef.current = null;
    };
  }, [active, queryClient]);

  const reconnect = useCallback(() => connectionRef.current?.reconnect(), []);

  return {
    isConnected: status === 'open',
    /** Estuvo conectado, se cortó y está volviendo. */
    isReconnecting: status === 'reconnecting',
    /** Reconecta ya, sin esperar el backoff. */
    reconnect,
  };
}
