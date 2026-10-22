import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVoicePresence } from '../useVoicePresence';

vi.mock('@discordia/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@discordia/core')>()),
  getClientConfig: () => ({
    baseUrl: 'http://localhost:8000',
    getToken: vi.fn().mockResolvedValue('mock-token'),
  }),
}));

class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];

  readyState = 0;
  sent: any[] = [];
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  close = vi.fn(() => {
    this.readyState = 3;
  });

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  receive(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  drop() {
    this.readyState = 3;
    this.onclose?.();
  }
}

// Espera a que se resuelva el getToken y se cree el socket
const flush = () => act(async () => {});

describe('useVoicePresence', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('se conecta a /ws/voice con el token y se suscribe a los canales', async () => {
    renderHook(() => useVoicePresence(['chan-1', 'chan-2']));
    await flush();

    const ws = MockWebSocket.instances[0];
    expect(ws.url).toBe('ws://localhost:8000/ws/voice?token=mock-token');
    act(() => ws.open());
    expect(ws.sent).toEqual([{ type: 'subscribe', channelIds: ['chan-1', 'chan-2'] }]);
  });

  it('no se conecta si no hay canales de voz', async () => {
    renderHook(() => useVoicePresence([]));
    await flush();
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('actualiza los participantes de cada canal con los mensajes del servidor', async () => {
    const { result } = renderHook(() => useVoicePresence(['chan-1', 'chan-2']));
    await flush();
    const ws = MockWebSocket.instances[0];
    act(() => ws.open());

    act(() => {
      ws.receive({ type: 'presence', channelId: 'chan-1', userIds: ['auth0|a'] });
      ws.receive({ type: 'presence', channelId: 'chan-2', userIds: [] });
    });
    expect(result.current).toEqual({ 'chan-1': ['auth0|a'], 'chan-2': [] });

    act(() => ws.receive({ type: 'presence', channelId: 'chan-1', userIds: ['auth0|a', 'auth0|b'] }));
    expect(result.current['chan-1']).toEqual(['auth0|a', 'auth0|b']);
  });

  it('al cambiar de servidor reemplaza la suscripción sin reconectar', async () => {
    const { result, rerender } = renderHook(({ ids }) => useVoicePresence(ids), {
      initialProps: { ids: ['chan-1'] },
    });
    await flush();
    const ws = MockWebSocket.instances[0];
    act(() => ws.open());
    act(() => ws.receive({ type: 'presence', channelId: 'chan-1', userIds: ['auth0|a'] }));

    rerender({ ids: ['chan-9'] });

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(ws.sent.at(-1)).toEqual({ type: 'subscribe', channelIds: ['chan-9'] });
    // Los datos del servidor anterior se descartan
    expect(result.current).toEqual({});
  });

  it('se reconecta si se corta la conexión', async () => {
    vi.useFakeTimers();
    renderHook(() => useVoicePresence(['chan-1']));
    await flush();
    act(() => MockWebSocket.instances[0].drop());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it('cierra la conexión al desmontar', async () => {
    const { unmount } = renderHook(() => useVoicePresence(['chan-1']));
    await flush();
    const ws = MockWebSocket.instances[0];

    unmount();

    expect(ws.close).toHaveBeenCalled();
  });
});
