import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../../api/client';
import { openChatSocket } from '../chatSocket';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event?: { code?: number }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  });
  addEventListener = vi.fn();
  removeEventListener = vi.fn();

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  receive(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  drop() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  /** El servidor cierra con un código (4003 baneado, 4002 expulsado o salió). */
  closeWith(code: number) {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code });
  }
}

describe('openChatSocket', () => {
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

  it('se conecta a la URL derivada de la API (https -> wss) con el token', async () => {
    const connection = openChatSocket('c1', { onMessage: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);

    expect(FakeWebSocket.instances[0].url).toBe('wss://api.discordia.lol/api/v1/chat/channels/c1/ws?token=tok');
    connection.close();
  });

  it('usa wsBaseUrl si está configurada', async () => {
    configureClient({ wsBaseUrl: 'ws://chat.local/' });
    const connection = openChatSocket('c1', { onMessage: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);

    expect(FakeWebSocket.instances[0].url).toBe('ws://chat.local/api/v1/chat/channels/c1/ws?token=tok');
    connection.close();
  });

  it('manda el último mensaje que tiene la app como last_message_id_seen', async () => {
    const connection = openChatSocket('c1', { onMessage: vi.fn() }, { getLastMessageIdSeen: () => 'm-41' });
    await vi.advanceTimersByTimeAsync(0);

    expect(FakeWebSocket.instances[0].url).toContain('last_message_id_seen=m-41');
    connection.close();
  });

  it('al reconectar sin dato de la app, pide desde el último mensaje recibido por el socket', async () => {
    const onMessage = vi.fn();
    const onReconnect = vi.fn();
    const connection = openChatSocket('c1', { onMessage, onReconnect });
    await vi.advanceTimersByTimeAsync(0);
    const first = FakeWebSocket.instances[0];
    first.open();
    first.receive({ id: 'm-7', content: 'hola', authorId: 'u2', channelId: 'c1', createdAt: 'x' });

    first.drop();
    await vi.advanceTimersByTimeAsync(1000);
    const second = FakeWebSocket.instances[1];
    second.open();

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(second.url).toContain('last_message_id_seen=m-7');
    expect(onReconnect).toHaveBeenCalledTimes(1);
    connection.close();
  });

  it('entrega los errores del servidor a onError (sin loguearlos)', async () => {
    const onError = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const connection = openChatSocket('c1', { onMessage: vi.fn(), onError });
    await vi.advanceTimersByTimeAsync(0);
    FakeWebSocket.instances[0].open();

    FakeWebSocket.instances[0].receive({ error: 'Missing permission SEND_MESSAGES' });

    expect(onError).toHaveBeenCalledWith('Missing permission SEND_MESSAGES');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
    connection.close();
  });

  it('entrega MESSAGE_REACTION_UPDATED a onMessageUpdated', async () => {
    const onMessageUpdated = vi.fn();
    const connection = openChatSocket('c1', { onMessage: vi.fn(), onMessageUpdated });
    await vi.advanceTimersByTimeAsync(0);
    FakeWebSocket.instances[0].open();

    const payload = {
      type: 'MESSAGE_REACTION_UPDATED',
      id: 'm1',
      content: 'hola',
      authorId: 'u1',
      channelId: 'c1',
      createdAt: '2026-10-20T10:00:00Z',
      reactions: [{ emoji: '👍', count: 1, users: ['u1'] }],
    };
    FakeWebSocket.instances[0].receive(payload);

    expect(onMessageUpdated).toHaveBeenCalledWith(payload);
    connection.close();
  });

  it('reconnect() cambia de socket al instante y el viejo no programa otra reconexión', async () => {
    const connection = openChatSocket('c1', { onMessage: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    FakeWebSocket.instances[0].open();

    connection.reconnect();
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(FakeWebSocket.instances[0].close).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(20_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    connection.close();
  });

  it('después de estar abierta, un corte se informa como reconnecting hasta que vuelve', async () => {
    const onStatusChange = vi.fn();
    const connection = openChatSocket('c1', { onMessage: vi.fn(), onStatusChange });
    await vi.advanceTimersByTimeAsync(0);
    // Sin haber conectado nunca, un corte no es una reconexión
    FakeWebSocket.instances[0].drop();
    expect(onStatusChange).toHaveBeenLastCalledWith('closed');

    await vi.advanceTimersByTimeAsync(1000);
    FakeWebSocket.instances[1].open();
    expect(onStatusChange).toHaveBeenLastCalledWith('open');

    FakeWebSocket.instances[1].drop();
    expect(onStatusChange).toHaveBeenLastCalledWith('reconnecting');
    await vi.advanceTimersByTimeAsync(1000);
    expect(onStatusChange).toHaveBeenLastCalledWith('reconnecting');
    FakeWebSocket.instances[2].open();
    expect(onStatusChange).toHaveBeenLastCalledWith('open');

    connection.close();
    expect(onStatusChange).toHaveBeenLastCalledWith('closed');
  });

  it('send rechaza si el socket está cerrado', async () => {
    const connection = openChatSocket('c1', { onMessage: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    FakeWebSocket.instances[0].drop();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(connection.send('hola', 'u1')).rejects.toThrow('WebSocket not connected');
    connection.close();
  });

  describe('permisos de escritura (W1)', () => {
    it('cada conexión arranca pudiendo escribir y sigue los PERMISSIONS_UPDATED del canal', async () => {
      const onPermissionsChange = vi.fn();
      const connection = openChatSocket('c1', { onMessage: vi.fn(), onPermissionsChange });
      await vi.advanceTimersByTimeAsync(0);
      const ws = FakeWebSocket.instances[0];

      ws.open();
      expect(onPermissionsChange).toHaveBeenLastCalledWith(true);

      ws.receive({ type: 'PERMISSIONS_UPDATED', canSend: false, channelId: 'c1' });
      expect(onPermissionsChange).toHaveBeenLastCalledWith(false);

      ws.receive({ type: 'PERMISSIONS_UPDATED', canSend: true, channelId: 'c1' });
      expect(onPermissionsChange).toHaveBeenLastCalledWith(true);
      connection.close();
    });

    it('ignora los avisos de otro canal y no los trata como mensajes', async () => {
      const onPermissionsChange = vi.fn();
      const onMessage = vi.fn();
      const connection = openChatSocket('c1', { onMessage, onPermissionsChange });
      await vi.advanceTimersByTimeAsync(0);
      FakeWebSocket.instances[0].open();
      onPermissionsChange.mockClear();

      FakeWebSocket.instances[0].receive({ type: 'PERMISSIONS_UPDATED', canSend: false, channelId: 'otro' });

      expect(onPermissionsChange).not.toHaveBeenCalled();
      expect(onMessage).not.toHaveBeenCalled();
      connection.close();
    });

    it('un 403 al enviar también deja sin permiso (por si el aviso no llegó)', async () => {
      const onPermissionsChange = vi.fn();
      const connection = openChatSocket('c1', { onMessage: vi.fn(), onError: vi.fn(), onPermissionsChange });
      await vi.advanceTimersByTimeAsync(0);
      FakeWebSocket.instances[0].open();

      FakeWebSocket.instances[0].receive({ error: 'User does not have permission', status: 403 });

      expect(onPermissionsChange).toHaveBeenLastCalledWith(false);
      connection.close();
    });
  });

  describe('ban o expulsión (W2)', () => {
    it.each([
      [4003, 'banned'],
      [4002, 'removed'],
    ] as const)('al cerrar con %i avisa %s y no vuelve a intentar', async (code, reason) => {
      const onRemoved = vi.fn();
      const onStatusChange = vi.fn();
      const connection = openChatSocket('c1', { onMessage: vi.fn(), onRemoved, onStatusChange });
      await vi.advanceTimersByTimeAsync(0);
      FakeWebSocket.instances[0].open();

      FakeWebSocket.instances[0].closeWith(code);
      await vi.advanceTimersByTimeAsync(60_000);

      expect(onRemoved).toHaveBeenCalledWith(reason);
      expect(onStatusChange).toHaveBeenLastCalledWith('removed');
      expect(FakeWebSocket.instances).toHaveLength(1);

      // Ni reconnect() la revive
      connection.reconnect();
      await vi.advanceTimersByTimeAsync(0);
      expect(FakeWebSocket.instances).toHaveLength(1);
      connection.close();
    });

    it('otros códigos de cierre siguen reconectando', async () => {
      const onRemoved = vi.fn();
      const connection = openChatSocket('c1', { onMessage: vi.fn(), onRemoved });
      await vi.advanceTimersByTimeAsync(0);
      FakeWebSocket.instances[0].open();

      FakeWebSocket.instances[0].closeWith(1006);
      await vi.advanceTimersByTimeAsync(1000);

      expect(onRemoved).not.toHaveBeenCalled();
      expect(FakeWebSocket.instances).toHaveLength(2);
      connection.close();
    });
  });
});
