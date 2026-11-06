import { getClientConfig, getWsBaseUrl } from '../api/client';
import { getApiMock } from '../api/mock';
import type { Conversation, MessageBackendPayload } from '../types';
import { reconnectDelayMs, type ChatSocketStatus } from './chatSocket';

/** Mismos estados que el chat, salvo `removed`: del inbox nunca sacan a nadie. */
export type InboxSocketStatus = Exclude<ChatSocketStatus, 'removed'>;

/** Lo que Chat-Engine publica en `inbox:<userId>`. */
export type InboxEvent =
  | { type: 'DM_MESSAGE'; conversationId: string; message: MessageBackendPayload }
  | { type: 'DM_CONVERSATION'; conversation: Conversation };

export interface InboxSocketHandlers {
  onEvent: (event: InboxEvent) => void;
  /** La conexión volvió después de un corte: lo que pasó en el medio se recupera con GET /conversations. */
  onReconnect?: () => void;
  onStatusChange?: (status: InboxSocketStatus) => void;
}

export interface InboxSocketConnection {
  /** Corta la conexión actual y reconecta ya, sin esperar el backoff. */
  reconnect: () => void;
  /** Cierra la conexión sin reconectar. */
  close: () => void;
}

function isInboxEvent(data: { type?: unknown; conversationId?: unknown; message?: unknown; conversation?: unknown }) {
  if (data.type === 'DM_MESSAGE') return typeof data.conversationId === 'string' && Boolean(data.message);
  return data.type === 'DM_CONVERSATION' && Boolean(data.conversation);
}

/**
 * WebSocket del usuario: lo que le llega aunque no tenga esa conversación abierta. Reconecta igual que
 * openChatSocket, con backoff exponencial y un token nuevo en cada intento. El heartbeat es de protocolo:
 * lo responde solo el navegador o la app, y con eso Chat-Engine renueva la presencia.
 */
export function openInboxSocket(handlers: InboxSocketHandlers): InboxSocketConnection {
  const setStatus = (status: InboxSocketStatus) => handlers.onStatusChange?.(status);

  const mock = getApiMock();
  if (mock?.subscribeInbox) {
    const unsubscribe = mock.subscribeInbox(handlers.onEvent);
    setStatus('open');
    return {
      reconnect: () => {},
      close: () => {
        unsubscribe();
        setStatus('closed');
      },
    };
  }

  let disposed = false;
  let attempts = 0;
  let hasConnectedBefore = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let socket: WebSocket | null = null;

  const scheduleReconnect = () => {
    if (disposed) return;
    const delay = reconnectDelayMs(attempts);
    attempts += 1;
    reconnectTimer = setTimeout(connect, delay);
  };

  const setPending = (status: 'connecting' | 'closed') => setStatus(hasConnectedBefore ? 'reconnecting' : status);

  const connect = async () => {
    setPending('connecting');
    let token: string;
    try {
      token = await getClientConfig().getToken();
    } catch (err) {
      console.error('[Inbox] Auth error', err);
      setPending('closed');
      scheduleReconnect();
      return;
    }
    if (disposed) return;

    const params = new URLSearchParams({ token });
    const ws = new WebSocket(`${getWsBaseUrl()}/api/v1/chat/inbox/ws?${params.toString()}`);
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
        if (isInboxEvent(data)) handlers.onEvent(data as InboxEvent);
      } catch (e) {
        console.error('[Inbox] Error parsing message', e);
      }
    };

    ws.onclose = () => {
      // Un socket reemplazado (reconnect / close) no vuelve a programar nada
      if (socket !== ws) return;
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
