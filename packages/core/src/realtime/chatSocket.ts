import { getClientConfig, getWsBaseUrl } from '../api/client';
import type { MessageBackendPayload } from '../types';

// Mismo backoff que la presencia de voz: 1 s, 2 s, 4 s… hasta 15 s entre intentos
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

export type ChatSocketStatus = 'connecting' | 'open' | 'closed';

export interface ChatSocketHandlers {
  onMessage: (message: MessageBackendPayload) => void;
  /** Error informado por el servidor (p. ej. sin permiso para escribir). Sin handler, se loguea. */
  onError?: (message: string) => void;
  /** La conexión volvió después de un corte: los mensajes del corte llegan por last_message_id_seen. */
  onReconnect?: () => void;
  onStatusChange?: (status: ChatSocketStatus) => void;
}

export interface ChatSocketOptions {
  /**
   * Último mensaje que la app ya tiene (p. ej. el último del historial). Si no se pasa, se usa el
   * último recibido por este socket. Al conectar se manda como last_message_id_seen y el servidor
   * reenvía lo que llegó después.
   */
  getLastMessageIdSeen?: () => string | undefined;
}

export interface ChatSocketConnection {
  /** Envía un mensaje. Si el socket está conectando, espera a que abra; si está cerrado, rechaza. */
  send: (content: string, authorId: string) => Promise<void>;
  /** Corta la conexión actual y reconecta ya, sin esperar el backoff. */
  reconnect: () => void;
  /** Cierra la conexión sin reconectar. */
  close: () => void;
}

/**
 * WebSocket del canal de chat, igual en web y mobile. Si la conexión se corta (red, deploy, proxy)
 * se reconecta sola con backoff exponencial, pidiendo un token nuevo en cada intento, y al volver
 * recupera los mensajes que llegaron durante el corte.
 */
export function openChatSocket(
  channelId: string,
  handlers: ChatSocketHandlers,
  options: ChatSocketOptions = {}
): ChatSocketConnection {
  let disposed = false;
  let attempts = 0;
  let hasConnectedBefore = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let socket: WebSocket | null = null;
  let lastReceivedId: string | undefined;

  const setStatus = (status: ChatSocketStatus) => handlers.onStatusChange?.(status);

  const scheduleReconnect = () => {
    if (disposed) return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
    attempts += 1;
    reconnectTimer = setTimeout(connect, delay);
  };

  const connect = async () => {
    setStatus('connecting');
    let token: string;
    try {
      token = await getClientConfig().getToken();
    } catch (err) {
      console.error('[WS] Auth error', err);
      setStatus('closed');
      scheduleReconnect();
      return;
    }
    if (disposed) return;

    const params = new URLSearchParams({ token });
    const lastSeen = options.getLastMessageIdSeen?.() ?? lastReceivedId;
    if (lastSeen) params.append('last_message_id_seen', lastSeen);

    const ws = new WebSocket(`${getWsBaseUrl()}/api/v1/chat/channels/${channelId}/ws?${params.toString()}`);
    socket = ws;

    ws.onopen = () => {
      attempts = 0;
      setStatus('open');
      if (hasConnectedBefore) handlers.onReconnect?.();
      hasConnectedBefore = true;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          if (handlers.onError) handlers.onError(String(data.error));
          else console.error('[WS] Server Error:', data.error);
          return;
        }

        if (data.id && typeof data.content === 'string') {
          lastReceivedId = data.id;
          handlers.onMessage(data as MessageBackendPayload);
        }
      } catch (e) {
        console.error('[WS] Error parsing message', e);
      }
    };

    ws.onclose = () => {
      // Un socket reemplazado (reconnect / close) no vuelve a programar nada
      if (socket !== ws) return;
      setStatus('closed');
      scheduleReconnect();
    };
  };

  /** Cierra el socket actual sin que su onclose programe otra reconexión. */
  const detachSocket = () => {
    const current = socket;
    socket = null;
    current?.close();
  };

  connect();

  return {
    send(content, authorId) {
      const ws = socket;
      if (!ws) return Promise.reject(new Error('WebSocket not initialized'));

      const sendPayload = () => ws.send(JSON.stringify({ authorId, content }));

      if (ws.readyState === WebSocket.OPEN) {
        sendPayload();
        return Promise.resolve();
      }
      if (ws.readyState === WebSocket.CONNECTING) {
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
      }
      console.warn('[WS] WebSocket is not open. Cannot send message.');
      return Promise.reject(new Error('WebSocket not connected'));
    },

    reconnect() {
      if (disposed) return;
      clearTimeout(reconnectTimer);
      attempts = 0;
      detachSocket();
      connect();
    },

    close() {
      disposed = true;
      clearTimeout(reconnectTimer);
      detachSocket();
      setStatus('closed');
    },
  };
}
