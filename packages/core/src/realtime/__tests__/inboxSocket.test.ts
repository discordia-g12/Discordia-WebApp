import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../../api/client';
import { setApiMock, type ApiMock } from '../../api/mock';
import { openChatSocket } from '../chatSocket';
import { isInboxEvent, openInboxSocket, PRESENCE_SYNC_DEBOUNCE_MS, type InboxEvent } from '../inboxSocket';
import { resetPresenceSync, setPresenceInactive, watchPresence } from '../presenceSync';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onclose: ((event?: { code?: number }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  close = vi.fn(() => {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  });

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  receive(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  receiveRaw(data: string) {
    this.onmessage?.({ data });
  }

  drop() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
}

const callPayload = {
  id: 'c1',
  conversationId: 'dm-1',
  callerId: 'u1',
  calleeId: 'u2',
  status: 'ringing',
  createdAt: '2026-11-12T10:00:00.000Z',
  expiresAt: '2026-11-12T10:00:30.000Z',
};

describe('isInboxEvent: llamadas', () => {
  it.each(['CALL_RINGING', 'CALL_ACCEPTED', 'CALL_ENDED'])('acepta %s con una llamada completa', (type) => {
    expect(isInboxEvent({ type, call: callPayload })).toBe(true);
    expect(isInboxEvent({ type, call: { ...callPayload, status: 'ended', endReason: 'missed' } })).toBe(true);
  });

  it('rechaza una llamada ausente o incompleta', () => {
    expect(isInboxEvent({ type: 'CALL_RINGING' })).toBe(false);
    expect(isInboxEvent({ type: 'CALL_RINGING', call: null })).toBe(false);
    expect(isInboxEvent({ type: 'CALL_RINGING', call: 'c1' })).toBe(false);
    for (const field of ['id', 'conversationId', 'callerId', 'calleeId', 'expiresAt'] as const) {
      expect(isInboxEvent({ type: 'CALL_ENDED', call: { ...callPayload, [field]: '' } })).toBe(false);
      expect(isInboxEvent({ type: 'CALL_ENDED', call: { ...callPayload, [field]: undefined } })).toBe(false);
    }
    expect(isInboxEvent({ type: 'CALL_ACCEPTED', call: { ...callPayload, status: 'otro' } })).toBe(false);
    expect(isInboxEvent({ type: 'CALL_OTRO', call: callPayload })).toBe(false);
  });
});

describe('openInboxSocket', () => {
  const originalWebSocket = globalThis.WebSocket;
  const last = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    configureClient({ baseUrl: 'https://api.discordia.lol', wsBaseUrl: undefined, getToken: async () => 'tok' });
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    setApiMock(null);
    vi.useRealTimers();
  });

  it('se conecta al inbox del usuario con el token', async () => {
    const connection = openInboxSocket({ onEvent: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);

    expect(last().url).toBe('wss://api.discordia.lol/api/v1/chat/inbox/ws?token=tok');
    connection.close();
  });

  it('entrega los tipos de evento', async () => {
    const onEvent = vi.fn();
    const connection = openInboxSocket({ onEvent });
    await vi.advanceTimersByTimeAsync(0);
    last().open();

    const message = { type: 'DM_MESSAGE', conversationId: 'dm-1', message: { id: 'm1' } };
    const conversation = { type: 'DM_CONVERSATION', conversation: { id: 'dm-1' } };
    const reaction = {
      type: 'DM_MESSAGE_REACTION_UPDATED',
      conversationId: 'dm-1',
      message: { id: 'm1', reactions: [{ emoji: '👍', count: 1, users: ['u1'] }] },
    };
    const serverUpdated = { type: 'SERVER_UPDATED', serverId: 'srv-1' };
    const serverDeleted = { type: 'SERVER_DELETED', serverId: 'srv-1' };
    last().receive(message);
    last().receive(conversation);
    last().receive(reaction);
    last().receive(serverUpdated);
    last().receive(serverDeleted);

    expect(onEvent.mock.calls).toEqual([
      [message],
      [conversation],
      [reaction],
      [serverUpdated],
      [serverDeleted],
    ]);
    connection.close();
  });

  it('ignora eventos desconocidos, incompletos o que no son JSON', async () => {
    const onEvent = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const connection = openInboxSocket({ onEvent });
    await vi.advanceTimersByTimeAsync(0);
    last().open();

    last().receive({ type: 'OTRA_COSA' });
    last().receive({ type: 'DM_MESSAGE', conversationId: 'dm-1' });
    last().receive({ type: 'DM_CONVERSATION' });
    last().receive({ type: 'SERVER_UPDATED' });
    last().receive({ type: 'SERVER_UPDATED', serverId: '' });
    last().receive({ type: 'SERVER_DELETED' });
    last().receive({ type: 'SERVER_DELETED', serverId: '' });
    last().receiveRaw('no es json');

    expect(onEvent).not.toHaveBeenCalled();
    connection.close();
    consoleError.mockRestore();
  });

  it('entrega los eventos de llamadas', async () => {
    const onEvent = vi.fn();
    const connection = openInboxSocket({ onEvent });
    await vi.advanceTimersByTimeAsync(0);
    last().open();

    const events = (['CALL_RINGING', 'CALL_ACCEPTED', 'CALL_ENDED'] as const).map((type) => ({ type, call: callPayload }));
    events.forEach((event) => last().receive(event));

    expect(onEvent.mock.calls).toEqual(events.map((event) => [event]));
    connection.close();
  });

  it('reconecta con backoff y un token nuevo, y avisa al volver', async () => {
    const getToken = vi.fn().mockResolvedValueOnce('tok-1').mockResolvedValue('tok-2');
    configureClient({ getToken });
    const onReconnect = vi.fn();
    const statuses: string[] = [];
    const connection = openInboxSocket({ onEvent: vi.fn(), onReconnect, onStatusChange: (s) => statuses.push(s) });
    await vi.advanceTimersByTimeAsync(0);
    last().open();
    expect(onReconnect).not.toHaveBeenCalled();

    last().drop();
    await vi.advanceTimersByTimeAsync(999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(last().url).toContain('token=tok-2');

    last().open();
    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(['connecting', 'open', 'reconnecting', 'reconnecting', 'open']);
    connection.close();
  });

  it('duplica la espera entre intentos fallidos, hasta 15 s, y la reinicia al conectar', async () => {
    const connection = openInboxSocket({ onEvent: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);

    for (const delay of [1000, 2000, 4000, 8000, 15000, 15000]) {
      const before = FakeWebSocket.instances.length;
      last().drop();
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(FakeWebSocket.instances).toHaveLength(before);
      await vi.advanceTimersByTimeAsync(1);
      expect(FakeWebSocket.instances).toHaveLength(before + 1);
    }

    last().open();
    last().drop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeWebSocket.instances).toHaveLength(8);
    connection.close();
  });

  it('reintenta si falla el token', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    configureClient({ getToken: vi.fn().mockRejectedValueOnce(new Error('sin token')).mockResolvedValue('tok') });
    const connection = openInboxSocket({ onEvent: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeWebSocket.instances).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    connection.close();
    consoleError.mockRestore();
  });

  it('reconnect corta y vuelve a conectar ya, sin duplicar sockets', async () => {
    const connection = openInboxSocket({ onEvent: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    last().open();
    const first = last();

    connection.reconnect();
    await vi.advanceTimersByTimeAsync(0);
    expect(first.close).toHaveBeenCalled();
    expect(FakeWebSocket.instances).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    connection.close();
  });

  it('close no reconecta', async () => {
    const statuses: string[] = [];
    const connection = openInboxSocket({ onEvent: vi.fn(), onStatusChange: (s) => statuses.push(s) });
    await vi.advanceTimersByTimeAsync(0);
    last().open();

    connection.close();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(statuses[statuses.length - 1]).toBe('closed');
  });

  it('con mock no abre un WebSocket: recibe los eventos del mock', async () => {
    let emit: (event: InboxEvent) => void = () => {};
    const unsubscribe = vi.fn();
    setApiMock({
      subscribeInbox: (onEvent) => {
        emit = onEvent;
        return unsubscribe;
      },
    } as Partial<ApiMock> as ApiMock);
    const onEvent = vi.fn();
    const statuses: string[] = [];

    const connection = openInboxSocket({ onEvent, onStatusChange: (s) => statuses.push(s) });
    await vi.advanceTimersByTimeAsync(0);
    const event = { type: 'DM_CONVERSATION', conversation: { id: 'dm-1' } } as InboxEvent;
    emit(event);
    connection.close();

    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(onEvent).toHaveBeenCalledWith(event);
    expect(statuses).toEqual(['open', 'closed']);
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe('openChatSocket con una conversación', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    configureClient({ baseUrl: 'https://api.discordia.lol', wsBaseUrl: undefined, getToken: async () => 'tok' });
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    vi.useRealTimers();
  });

  it('un 403 rechaza ese mensaje pero no marca "sin permiso": en un DM se revisa en cada envío', async () => {
    const onError = vi.fn();
    const onPermissionsChange = vi.fn();
    const connection = openChatSocket('dm-1', { onMessage: vi.fn(), onError, onPermissionsChange });
    await vi.advanceTimersByTimeAsync(0);
    FakeWebSocket.instances[0].open();
    onPermissionsChange.mockClear();

    FakeWebSocket.instances[0].receive({ error: 'DM_NOT_DELIVERABLE', status: 403 });

    expect(onError).toHaveBeenCalledWith('DM_NOT_DELIVERABLE');
    expect(onPermissionsChange).not.toHaveBeenCalled();
    connection.close();
  });

  it('en un canal sigue marcando "sin permiso"', async () => {
    const onPermissionsChange = vi.fn();
    const connection = openChatSocket('c1', { onMessage: vi.fn(), onError: vi.fn(), onPermissionsChange });
    await vi.advanceTimersByTimeAsync(0);
    FakeWebSocket.instances[0].open();

    FakeWebSocket.instances[0].receive({ error: 'Forbidden', status: 403 });

    expect(onPermissionsChange).toHaveBeenLastCalledWith(false);
    connection.close();
  });
});

describe('isInboxEvent: presencia', () => {
  it('acepta cambios, snapshots y el estado propio bien formados', () => {
    expect(isInboxEvent({ type: 'PRESENCE_UPDATE', userId: 'u1', status: 'idle' })).toBe(true);
    expect(isInboxEvent({ type: 'PRESENCE_SNAPSHOT', statuses: { u1: 'online', u2: 'offline' } })).toBe(true);
    expect(isInboxEvent({ type: 'PRESENCE_SNAPSHOT', statuses: {} })).toBe(true);
    expect(isInboxEvent({ type: 'MY_STATUS', status: 'invisible' })).toBe(true);
  });

  it('rechaza estados desconocidos o datos que faltan', () => {
    expect(isInboxEvent({ type: 'PRESENCE_UPDATE', userId: '', status: 'idle' })).toBe(false);
    expect(isInboxEvent({ type: 'PRESENCE_UPDATE', userId: 'u1', status: 'invisible' })).toBe(false);
    expect(isInboxEvent({ type: 'PRESENCE_SNAPSHOT', statuses: null })).toBe(false);
    expect(isInboxEvent({ type: 'PRESENCE_SNAPSHOT', statuses: { u1: 'busy' } })).toBe(false);
    expect(isInboxEvent({ type: 'MY_STATUS', status: 'offline' })).toBe(false);
  });
});

describe('openInboxSocket: presencia', () => {
  const originalWebSocket = globalThis.WebSocket;
  const last = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    resetPresenceSync();
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    configureClient({ baseUrl: 'https://api.discordia.lol', wsBaseUrl: undefined, getToken: async () => 'tok' });
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    resetPresenceSync();
    vi.useRealTimers();
  });

  it('al conectarse manda a quién sigue y si está inactivo', async () => {
    watchPresence(['u2', 'u1']);
    setPresenceInactive(true);
    const connection = openInboxSocket({ onEvent: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);

    last().open();

    expect(last().sent).toEqual([
      { type: 'PRESENCE_SUBSCRIBE', userIds: ['u1', 'u2'] },
      { type: 'ACTIVITY', idle: true },
    ]);
    connection.close();
  });

  it('sin nadie a quien seguir y con actividad, no manda nada', async () => {
    const connection = openInboxSocket({ onEvent: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    last().open();

    expect(last().sent).toEqual([]);
    connection.close();
  });

  it('junta los cambios seguidos en un solo mensaje y no repite lo mismo', async () => {
    const connection = openInboxSocket({ onEvent: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    last().open();

    const friends = watchPresence(['u1']);
    watchPresence(['u2']);
    await vi.advanceTimersByTimeAsync(PRESENCE_SYNC_DEBOUNCE_MS);
    expect(last().sent).toEqual([{ type: 'PRESENCE_SUBSCRIBE', userIds: ['u1', 'u2'] }]);

    // Se suelta y se vuelve a anotar el mismo: la lista no cambió
    friends();
    watchPresence(['u1']);
    await vi.advanceTimersByTimeAsync(PRESENCE_SYNC_DEBOUNCE_MS);
    expect(last().sent).toHaveLength(1);

    setPresenceInactive(true);
    await vi.advanceTimersByTimeAsync(PRESENCE_SYNC_DEBOUNCE_MS);
    setPresenceInactive(false);
    await vi.advanceTimersByTimeAsync(PRESENCE_SYNC_DEBOUNCE_MS);
    expect(last().sent.slice(1)).toEqual([
      { type: 'ACTIVITY', idle: true },
      { type: 'ACTIVITY', idle: false },
    ]);
    connection.close();
  });

  it('al reconectar lo vuelve a mandar (el socket nuevo no sigue a nadie)', async () => {
    watchPresence(['u1']);
    const connection = openInboxSocket({ onEvent: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    last().open();
    const first = last();

    first.drop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(last()).not.toBe(first);
    last().open();

    expect(last().sent).toEqual([{ type: 'PRESENCE_SUBSCRIBE', userIds: ['u1'] }]);
    connection.close();
  });

  it('mientras conecta no manda nada, y cerrado deja de escuchar', async () => {
    const connection = openInboxSocket({ onEvent: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);

    watchPresence(['u1']);
    await vi.advanceTimersByTimeAsync(PRESENCE_SYNC_DEBOUNCE_MS);
    expect(last().sent).toEqual([]);

    connection.close();
    watchPresence(['u2']);
    await vi.advanceTimersByTimeAsync(PRESENCE_SYNC_DEBOUNCE_MS);
    expect(last().sent).toEqual([]);
  });

  it('entrega los eventos de presencia', async () => {
    const onEvent = vi.fn();
    const connection = openInboxSocket({ onEvent });
    await vi.advanceTimersByTimeAsync(0);
    last().open();

    last().receive({ type: 'PRESENCE_UPDATE', userId: 'u1', status: 'dnd' });
    last().receive({ type: 'PRESENCE_SNAPSHOT', statuses: { u1: 'online' } });
    last().receive({ type: 'MY_STATUS', status: 'idle' });

    expect(onEvent.mock.calls.map(([event]) => event.type)).toEqual(['PRESENCE_UPDATE', 'PRESENCE_SNAPSHOT', 'MY_STATUS']);
    connection.close();
  });
});
