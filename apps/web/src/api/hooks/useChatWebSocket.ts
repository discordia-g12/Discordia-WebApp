import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Message } from '../../types';
import { getClientConfig } from '@discordia/core';

// Mismo backoff que useVoicePresence: 1 s, 2 s, 4 s… hasta 15 s entre intentos
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

/**
 * WebSocket del canal de chat. Si la conexión se corta (red, deploy, proxy) se reconecta sola con
 * backoff exponencial y, al volver, pide de nuevo el historial para recuperar los mensajes que
 * llegaron durante el corte.
 */
export function useChatWebSocket(channelId: string | null, userId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!channelId || !userId) return;

    let disposed = false;
    let attempts = 0;
    let hasConnectedBefore = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | null = null;

    const scheduleReconnect = () => {
      if (disposed) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
      attempts += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = async () => {
      let token: string;
      try {
        token = await getClientConfig().getToken();
      } catch (err) {
        console.error('[WS] Auth error', err);
        scheduleReconnect();
        return;
      }
      if (disposed) return;

      const baseUrl = getClientConfig().baseUrl.replace(/^http/, 'ws');
      const ws = new WebSocket(`${baseUrl}/api/v1/chat/channels/${channelId}/ws?token=${token}`);
      socket = ws;
      wsRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        if (hasConnectedBefore) {
          // Reconexión: los mensajes enviados durante el corte no llegaron por el socket
          queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
        }
        hasConnectedBefore = true;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            console.error('[WS] Server Error:', data.error);
            return;
          }

          if (data.id && data.content) {
            // El autor se resuelve en la UI por authorId
            queryClient.setQueriesData(
              { queryKey: ['messages', channelId] },
              (old: Message[] | undefined) => {
                if (!old) return [data];
                // Evitar duplicados
                if (old.some(m => m.id === data.id)) return old;
                return [...old, data];
              }
            );
          }
        } catch (e) {
          console.error('[WS] Error parsing message', e);
        }
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      socket?.close();
      wsRef.current = null;
    };
  }, [channelId, userId, queryClient]);

  const sendMessageWs = useCallback(async (content: string) => {
    const ws = wsRef.current;
    if (!ws) throw new Error('WebSocket not initialized');

    const sendPayload = () => {
      ws.send(JSON.stringify({
        authorId: userId,
        content
      }));
    };

    if (ws.readyState === WebSocket.OPEN) {
      sendPayload();
    } else if (ws.readyState === WebSocket.CONNECTING) {
      return new Promise<void>((resolve, reject) => {
        const onOpen = () => {
          sendPayload();
          ws.removeEventListener('open', onOpen);
          ws.removeEventListener('error', onError);
          resolve();
        };
        const onError = () => {
          ws.removeEventListener('open', onOpen);
          ws.removeEventListener('error', onError);
          reject(new Error('WebSocket connection failed'));
        };
        ws.addEventListener('open', onOpen);
        ws.addEventListener('error', onError);
      });
    } else {
      console.warn('[WS] WebSocket is not open. Cannot send message.');
      throw new Error('WebSocket not connected');
    }
  }, [userId]);

  return { sendMessageWs };
}
