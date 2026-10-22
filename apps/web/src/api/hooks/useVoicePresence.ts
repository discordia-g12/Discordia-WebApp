import { useEffect, useRef, useState } from 'react';
import { getClientConfig } from '@discordia/core';

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

interface PresenceMessage {
  type: 'presence';
  channelId: string;
  userIds: string[];
}

/**
 * Quién está conectado a cada canal de voz, actualizado en vivo por WebSocket (/ws/voice).
 * El backend solo informa los canales a los que el usuario tiene acceso.
 *
 * @returns mapa channelId -> user IDs conectados
 */
export function useVoicePresence(channelIds: string[]): Record<string, string[]> {
  const [presence, setPresence] = useState<Record<string, string[]>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const channelIdsRef = useRef<string[]>(channelIds);
  channelIdsRef.current = channelIds;

  // Clave estable para no reenviar el subscribe si la lista no cambió
  const channelsKey = [...channelIds].sort().join(',');
  const isActive = channelIds.length > 0;

  useEffect(() => {
    if (!isActive) return;

    let disposed = false;
    let attempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      let token: string;
      try {
        token = await getClientConfig().getToken();
      } catch {
        scheduleReconnect();
        return;
      }
      if (disposed) return;

      const baseUrl = getClientConfig().baseUrl.replace(/\/$/, '').replace(/^http/, 'ws');
      const ws = new WebSocket(`${baseUrl}/ws/voice?token=${encodeURIComponent(token)}`);
      socketRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        ws.send(JSON.stringify({ type: 'subscribe', channelIds: channelIdsRef.current }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as PresenceMessage;
          if (data.type !== 'presence') return;
          setPresence((prev) => ({ ...prev, [data.channelId]: data.userIds }));
        } catch {
          // mensaje inválido
        }
      };

      ws.onclose = () => {
        if (socketRef.current === ws) socketRef.current = null;
        if (!disposed) scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
      attempts += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      disposed = true;
      clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
      setPresence({});
    };
  }, [isActive]);

  // Al cambiar de servidor (o de canales) se reemplaza la suscripción sin reconectar
  useEffect(() => {
    setPresence((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => channelIdsRef.current.includes(id)))
    );
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', channelIds: channelIdsRef.current }));
    }
  }, [channelsKey]);

  return presence;
}
