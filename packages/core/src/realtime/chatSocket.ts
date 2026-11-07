import { getClientConfig, getWsBaseUrl, notifyAccountSuspended } from '../api/client';
import { ACCOUNT_SUSPENDED_CLOSE_CODE } from '../api/errors';
import { isConversationId } from '../api/conversations';
import type { MessageAttachment, MessageBackendPayload } from '../types';

// Mismo backoff que la presencia de voz: 1 s, 2 s, 4 s… hasta 15 s entre intentos
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

/** Espera antes del reintento número `attempts` (desde 0). */
export function reconnectDelayMs(attempts: number): number {
  return Math.min(RECONNECT_BASE_MS * 2 ** attempts, RECONNECT_MAX_MS);
}

/**
 * connecting: primer intento. reconnecting: estuvo abierta, se cortó y está volviendo (la interfaz lo
 * avisa). closed: cerrada a pedido, o sin haber conectado nunca, esperando el próximo intento.
 * removed: el servidor la cerró porque el usuario ya no está en el servidor (ban, expulsión, salida); no
 * se reintenta.
 */
export type ChatSocketStatus = 'connecting' | 'open' | 'reconnecting' | 'closed' | 'removed';

/** Por qué el chat cerró la conexión para siempre: baneado, o expulsado / salió del servidor. */
export type ChatRemovalReason = 'banned' | 'removed';

/**
 * Códigos de cierre de Chat Engine (SessionManager.disconnectUser). Reintentar no sirve: cada intento
 * recibiría 403.
 */
const CLOSE_CODE_REMOVAL: Record<number, ChatRemovalReason> = {
  4003: 'banned',
  4002: 'removed',
};

export interface ChatSocketHandlers {
  onMessage: (message: MessageBackendPayload) => void;
  /** Error informado por el servidor (p. ej. sin permiso para escribir). Sin handler, se loguea. */
  onError?: (message: string) => void;
  /** La conexión volvió después de un corte: los mensajes del corte llegan por last_message_id_seen. */
  onReconnect?: () => void;
  onStatusChange?: (status: ChatSocketStatus) => void;
  /**
   * Cambió el permiso de escribir en el canal (mute, vence el mute, cambio de roles). Cada conexión
   * arranca en true: si no puede escribir, Chat Engine lo avisa apenas abre.
   */
  onPermissionsChange?: (canSend: boolean) => void;
  /** El usuario ya no está en el servidor (ban o expulsión): la conexión se cerró y no se reintenta. */
  onRemoved?: (reason: ChatRemovalReason) => void;
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
  send: (content: string, authorId: string, attachments?: MessageAttachment[]) => Promise<void>;
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
    const delay = reconnectDelayMs(attempts);
    attempts += 1;
    reconnectTimer = setTimeout(connect, delay);
  };

  // Después de haber estado abierta, todo lo que no sea "abierta" es una reconexión en curso
  const setPending = (status: 'connecting' | 'closed') => setStatus(hasConnectedBefore ? 'reconnecting' : status);

  const connect = async () => {
    setPending('connecting');
    let token: string;
    try {
      token = await getClientConfig().getToken();
    } catch (err) {
      console.error('[WS] Auth error', err);
      setPending('closed');
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
      // Conexión nueva: puede escribir salvo que el servidor diga lo contrario (lo manda enseguida)
      handlers.onPermissionsChange?.(true);
      setStatus('open');
      if (hasConnectedBefore) handlers.onReconnect?.();
      hasConnectedBefore = true;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'PERMISSIONS_UPDATED') {
          if (typeof data.canSend === 'boolean' && (!data.channelId || data.channelId === channelId)) {
            handlers.onPermissionsChange?.(data.canSend);
          }
          return;
        }

        if (data.error) {
          // Un 403 al enviar es que ya no puede escribir (por si el aviso de permisos no llegó). En un DM
          // solo rechaza ese mensaje: el bloqueo se revisa en cada envío y la interfaz no dice "silenciado"
          if (data.status === 403 && !isConversationId(channelId)) handlers.onPermissionsChange?.(false);
          if (handlers.onError) handlers.onError(String(data.error));
          else console.error('[WS] Server Error:', data.error);
          return;
        }

        if (data.id && (typeof data.content === 'string' || Array.isArray(data.attachments))) {
          lastReceivedId = data.id;
          handlers.onMessage(data as MessageBackendPayload);
        }
      } catch (e) {
        console.error('[WS] Error parsing message', e);
      }
    };

    ws.onclose = (event?: { code?: number }) => {
      // Un socket reemplazado (reconnect / close) no vuelve a programar nada
      if (socket !== ws) return;

      // Cuenta suspendida por el staff: no se reintenta y toda la app pasa a "suspendida"
      if (event?.code === ACCOUNT_SUSPENDED_CLOSE_CODE) {
        disposed = true;
        socket = null;
        setStatus('closed');
        notifyAccountSuspended();
        return;
      }

      const removal = CLOSE_CODE_REMOVAL[event?.code ?? 0];
      if (removal) {
        disposed = true;
        socket = null;
        setStatus('removed');
        handlers.onRemoved?.(removal);
        return;
      }

      setPending('closed');
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
    send(content, authorId, attachments) {
      const ws = socket;
      if (!ws) return Promise.reject(new Error('WebSocket not initialized'));

      const sendPayload = () =>
        ws.send(
          JSON.stringify({
            authorId,
            content,
            ...(attachments?.length ? { attachments } : {}),
          })
        );

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
