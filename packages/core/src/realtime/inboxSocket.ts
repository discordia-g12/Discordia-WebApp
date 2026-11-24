import { getClientConfig, getWsBaseUrl, notifyAccountSuspended } from '../api/client';
import { ACCOUNT_SUSPENDED_CLOSE_CODE } from '../api/errors';
import { getApiMock } from '../api/mock';
import type { Call } from '../api/calls';
import type { PreferredStatus, PresenceStatus } from '../api/presence';
import type { Conversation, MessageBackendPayload, ThreadSummary } from '../types';
import type { NotificationPreview } from '../api/notifications';
import { isThreadReplyEvent, reconnectDelayMs, type ChatSocketStatus } from './chatSocket';
import { getWatchedIds, isPresenceInactive, subscribePresenceSync } from './presenceSync';

/** Mismos estados que el chat, salvo `removed`: del inbox nunca sacan a nadie. */
export type InboxSocketStatus = Exclude<ChatSocketStatus, 'removed'>;

/** Lo que Chat-Engine publica en `inbox:<userId>`. */
export type InboxEvent =
  | { type: 'DM_MESSAGE'; conversationId: string; message: MessageBackendPayload }
  | { type: 'DM_MESSAGE_UPDATED'; conversationId: string; message: MessageBackendPayload }
  | { type: 'DM_MESSAGE_DELETED'; conversationId: string; message: MessageBackendPayload }
  | { type: 'DM_MESSAGE_REACTION_UPDATED'; conversationId: string; message: MessageBackendPayload }
  | { type: 'DM_CONVERSATION'; conversation: Conversation }
  /** Respuesta en un hilo de un DM (además llega por el socket del DM, si está abierto). */
  | {
      type: 'DM_THREAD_REPLY_CREATED';
      conversationId: string;
      parentId: string;
      reply: MessageBackendPayload;
      thread: ThreadSummary;
    }
  /** Notification-Service guardó un aviso para el usuario (ADR-07 de Notification): hay que volver a pedir la bandeja. */
  | { type: 'NOTIFICATION_CREATED'; notification: NotificationPreview }
  /** Cambió el nombre, la descripción, el ícono o el banner de un servidor del usuario: hay que volver a pedirlo. */
  | { type: 'SERVER_UPDATED'; serverId: string }
  /** Se eliminó un servidor del usuario (por su dueño o por el staff): hay que sacarlo de la lista. */
  | { type: 'SERVER_DELETED'; serverId: string }
  /** Llamada privada (Voice publica por Chat a los dos participantes, el mismo `call` para ambos). */
  | { type: 'CALL_RINGING'; call: Call }
  | { type: 'CALL_ACCEPTED'; call: Call }
  | { type: 'CALL_ENDED'; call: Call }
  /** Cambió la presencia de alguien que se sigue (PRESENCE_SUBSCRIBE), con el id tal como se pidió. */
  | { type: 'PRESENCE_UPDATE'; userId: string; status: PresenceStatus }
  /** Respuesta a PRESENCE_SUBSCRIBE: el estado actual de los que se siguen. */
  | { type: 'PRESENCE_SNAPSHOT'; statuses: Record<string, PresenceStatus> }
  /** El usuario cambió su estado elegido desde otra sesión. */
  | { type: 'MY_STATUS'; status: PreferredStatus };

export type CallInboxEvent = Extract<InboxEvent, { type: 'CALL_RINGING' | 'CALL_ACCEPTED' | 'CALL_ENDED' }>;

const CALL_EVENT_TYPES: ReadonlySet<unknown> = new Set(['CALL_RINGING', 'CALL_ACCEPTED', 'CALL_ENDED']);

const nonEmptyString = (value: unknown) => typeof value === 'string' && value.length > 0;

const PRESENCE_STATUSES: ReadonlySet<unknown> = new Set(['online', 'idle', 'dnd', 'offline']);
const PREFERRED_STATUSES: ReadonlySet<unknown> = new Set(['online', 'idle', 'dnd', 'invisible']);

/** Cada cuánto, como mucho, se le cuenta a Chat-Engine a quién se sigue (varias listas montan juntas). */
export const PRESENCE_SYNC_DEBOUNCE_MS = 100;

/** Lo mínimo para que la máquina de llamadas pueda decidir: ids, estado y vencimiento. */
function isCall(value: unknown): value is Call {
  if (typeof value !== 'object' || value === null) return false;
  const call = value as Record<string, unknown>;
  return (
    nonEmptyString(call.id) &&
    nonEmptyString(call.conversationId) &&
    nonEmptyString(call.callerId) &&
    nonEmptyString(call.calleeId) &&
    (call.status === 'ringing' || call.status === 'active' || call.status === 'ended') &&
    nonEmptyString(call.expiresAt)
  );
}

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

export function isInboxEvent(data: {
  type?: unknown;
  parentId?: unknown;
  reply?: unknown;
  thread?: unknown;
  notification?: unknown;
  conversationId?: unknown;
  message?: unknown;
  conversation?: unknown;
  serverId?: unknown;
  call?: unknown;
  userId?: unknown;
  status?: unknown;
  statuses?: unknown;
}): boolean {
  if (CALL_EVENT_TYPES.has(data.type)) return isCall(data.call);
  if (data.type === 'DM_THREAD_REPLY_CREATED') {
    return typeof data.conversationId === 'string' && isThreadReplyEvent(data as Record<string, unknown>);
  }
  if (data.type === 'NOTIFICATION_CREATED') {
    const notification = data.notification as Record<string, unknown> | null | undefined;
    return typeof notification?.channelId === 'string' && typeof notification.reason === 'string';
  }
  if (data.type === 'PRESENCE_UPDATE') return nonEmptyString(data.userId) && PRESENCE_STATUSES.has(data.status);
  if (data.type === 'PRESENCE_SNAPSHOT') {
    return (
      typeof data.statuses === 'object' &&
      data.statuses !== null &&
      Object.values(data.statuses).every((status) => PRESENCE_STATUSES.has(status))
    );
  }
  if (data.type === 'MY_STATUS') return PREFERRED_STATUSES.has(data.status);
  if (data.type === 'SERVER_UPDATED' || data.type === 'SERVER_DELETED') {
    return typeof data.serverId === 'string' && data.serverId.length > 0;
  }
  if (
    data.type === 'DM_MESSAGE' ||
    data.type === 'DM_MESSAGE_UPDATED' ||
    data.type === 'DM_MESSAGE_DELETED' ||
    data.type === 'DM_MESSAGE_REACTION_UPDATED'
  ) {
    return typeof data.conversationId === 'string' && Boolean(data.message);
  }
  return data.type === 'DM_CONVERSATION' && Boolean(data.conversation);
}

/**
 * WebSocket del usuario: lo que le llega aunque no tenga esa conversación abierta. Reconecta igual que
 * openChatSocket, con backoff exponencial y un token nuevo en cada intento. El heartbeat es de protocolo:
 * lo responde solo el navegador o la app, y con eso Chat-Engine renueva la presencia. Lo único que manda es
 * a quién se sigue (PRESENCE_SUBSCRIBE) y si hay actividad (ACTIVITY), según presenceSync.
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

  // Lo último que se le mandó al socket actual (uno nuevo arranca sin seguir a nadie y con actividad)
  let sentIds = '';
  let sentInactive = false;
  let syncTimer: ReturnType<typeof setTimeout> | undefined;

  const syncPresence = () => {
    syncTimer = undefined;
    const ws = socket;
    if (!ws || ws.readyState !== 1) return;
    const ids = getWatchedIds();
    if (ids.join(',') !== sentIds) {
      ws.send(JSON.stringify({ type: 'PRESENCE_SUBSCRIBE', userIds: ids }));
      sentIds = ids.join(',');
    }
    const inactive = isPresenceInactive();
    if (inactive !== sentInactive) {
      ws.send(JSON.stringify({ type: 'ACTIVITY', idle: inactive }));
      sentInactive = inactive;
    }
  };

  const unsubscribePresence = subscribePresenceSync(() => {
    if (syncTimer === undefined) syncTimer = setTimeout(syncPresence, PRESENCE_SYNC_DEBOUNCE_MS);
  });

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
      sentIds = '';
      sentInactive = false;
      syncPresence();
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
      clearTimeout(syncTimer);
      unsubscribePresence();
      detachSocket();
      setStatus('closed');
    },
  };
}
