import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Message } from '../../types';
import { getClientConfig } from '../client';

export function useChatWebSocket(channelId: string | null, userId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!channelId || !userId) return;

    let isSubscribed = true;
    let ws: WebSocket | null = null;

    const connect = async () => {
      try {
        const token = await getClientConfig().getToken();
        if (!isSubscribed) return;

        const baseUrl = getClientConfig().baseUrl.replace(/^http/, 'ws');
        const wsUrl = `${baseUrl}/api/v1/chat/channels/${channelId}/ws?token=${token}`;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log(`[WS] Connected to channel ${channelId}`);
        };

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.error) {
              console.error('[WS] Server Error:', data.error);
              return;
            }
            
            if (data.id && data.content) {
              if (data.authorId === userId && !data.author) {
                const { useSession } = await import('../../auth/session');
                const profile = useSession.getState().profile;
                if (profile) {
                  data.author = {
                    id: profile.id,
                    username: profile.email?.split('@')[0] || profile.username || 'User',
                    displayName: profile.displayName || profile.display_name || 'User',
                    avatar: profile.avatar || profile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
                    status: profile.status ||'online',
                  };
                }
              }

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
          console.log(`[WS] Disconnected from channel ${channelId}`);
        };
      } catch (err) {
        console.error('[WS] Auth error', err);
      }
    };

    connect();

    return () => {
      isSubscribed = false;
      if (ws) {
        ws.close();
      }
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
