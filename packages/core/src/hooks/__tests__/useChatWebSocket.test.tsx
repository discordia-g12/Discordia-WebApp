import { renderHook, act } from '@testing-library/react';
import { useChatWebSocket } from '../useChatSocket';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Message } from '../../types';

const mockGetToken = vi.fn().mockResolvedValue('mock-token');

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  getClientConfig: () => ({
    baseUrl: 'http://localhost:8000',
    getToken: mockGetToken
  })
}));

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  
  listeners: Record<string, (() => void)[]> = {};
  addEventListener = vi.fn((event: string, cb: () => void) => {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  });
  removeEventListener = vi.fn((event: string, cb: () => void) => {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(l => l !== cb);
  });

  constructor(url: string) {
    this.url = url;
  }

  _simulateOpen() {
    this.readyState = 1;
    if (this.onopen) this.onopen();
    if (this.listeners['open']) {
      this.listeners['open'].forEach(cb => cb());
    }
  }

  _simulateMessage(data: unknown) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(data) });
  }

  _simulateClose() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

/** Clase de WebSocket falso que le pasa al test cada conexión que abre el hook. */
function mockWebSocketClass(onCreate: (ws: MockWebSocket) => void): typeof WebSocket {
  return class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      onCreate(this);
    }
  } as unknown as typeof WebSocket;
}

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('useChatWebSocket', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should initialize, connect, and handle receiving messages', async () => {
    // Pre-seed query to allow setQueriesData to match
    queryClient.setQueryData(['messages', 'channel-1'], []);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    let wsInstance: MockWebSocket;
    const OriginalWebSocket = global.WebSocket;
    global.WebSocket = mockWebSocketClass((ws) => { wsInstance = ws; });
    global.WebSocket.CONNECTING = 0;
    global.WebSocket.OPEN = 1;

    const { unmount } = renderHook(() => useChatWebSocket('channel-1', 'user-1'), { wrapper });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    act(() => {
      wsInstance._simulateOpen();
    });

    await act(async () => {
      wsInstance._simulateMessage({ id: 'msg-1', content: 'hello', authorId: 'user-2' });
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Validamos en el queryCache con exact/active o recuperando el data exacto
    // setQueriesData impacta queries activas o inactivas que hagan match. 
    // Como pre-seteamos, debería estar.
    const cached = queryClient.getQueryData<Message[]>(['messages', 'channel-1']);
    expect(cached).toBeDefined();
    expect(cached).toHaveLength(1);
    expect(cached![0].content).toBe('hello');

    await act(async () => {
      wsInstance._simulateMessage({ id: 'msg-2', content: 'my message', authorId: 'user-1' });
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    const cached2 = queryClient.getQueryData<Message[]>(['messages', 'channel-1']);
    expect(cached2).toHaveLength(2);
    expect(cached2![1].authorId).toBe('user-1');
    expect(cached2![1].author).toBeUndefined();

    act(() => {
      wsInstance._simulateClose();
    });

    unmount();
    expect(wsInstance.close).toHaveBeenCalled();

    global.WebSocket = OriginalWebSocket;
  });

  it('reconnects with backoff after an unexpected close and refetches the channel history', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      const instances: MockWebSocket[] = [];
      global.WebSocket = mockWebSocketClass((ws) => instances.push(ws));
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { unmount } = renderHook(() => useChatWebSocket('channel-1', 'user-1'), { wrapper });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0); // getToken
      });
      act(() => instances[0]._simulateOpen());
      expect(invalidateSpy).not.toHaveBeenCalled(); // primera conexión: el historial ya lo pide la query

      act(() => instances[0]._simulateClose());
      await act(async () => {
        await vi.advanceTimersByTimeAsync(999);
      });
      expect(instances).toHaveLength(1); // todavía esperando el backoff

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(instances).toHaveLength(2);

      act(() => instances[1]._simulateOpen());
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['messages', 'channel-1'] });

      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not reconnect after unmount', async () => {
    vi.useFakeTimers();
    try {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      const instances: MockWebSocket[] = [];
      global.WebSocket = mockWebSocketClass((ws) => instances.push(ws));

      const { unmount } = renderHook(() => useChatWebSocket('channel-1', 'user-1'), { wrapper });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      act(() => instances[0]._simulateOpen());

      unmount();
      act(() => instances[0]._simulateClose());
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20_000);
      });

      expect(instances).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should handle errors in incoming messages gracefully', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    let wsInstance: MockWebSocket;
    global.WebSocket = mockWebSocketClass((ws) => { wsInstance = ws; });

    renderHook(() => useChatWebSocket('channel-1', 'user-1'), { wrapper });
    await new Promise(resolve => setTimeout(resolve, 50));
    
    act(() => {
      wsInstance._simulateOpen();
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      wsInstance._simulateMessage({ error: 'invalid token' });
    });
    expect(consoleSpy).toHaveBeenCalledWith('[WS] Server Error:', 'invalid token');

    await act(async () => {
      if (wsInstance.onmessage) wsInstance.onmessage({ data: 'not json' });
    });
    expect(consoleSpy).toHaveBeenCalledWith('[WS] Error parsing message', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('expone canSend según lo que informa el servidor y lo resetea al cambiar de canal', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const sockets: MockWebSocket[] = [];
    const OriginalWebSocket = global.WebSocket;
    global.WebSocket = mockWebSocketClass((ws) => sockets.push(ws));
    global.WebSocket.CONNECTING = 0;
    global.WebSocket.OPEN = 1;

    const { result, rerender, unmount } = renderHook(({ channelId }) => useChatWebSocket(channelId, 'user-1'), {
      wrapper,
      initialProps: { channelId: 'channel-1' as string | null },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    act(() => sockets[0]._simulateOpen());
    expect(result.current.canSend).toBe(true);

    act(() => sockets[0]._simulateMessage({ type: 'PERMISSIONS_UPDATED', canSend: false, channelId: 'channel-1' }));
    expect(result.current.canSend).toBe(false);

    // Sin canal (p. ej. DMs) se puede escribir
    rerender({ channelId: null });
    expect(result.current.canSend).toBe(true);

    unmount();
    global.WebSocket = OriginalWebSocket;
  });

  it('should send message immediately if OPEN', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    let wsInstance: MockWebSocket;
    global.WebSocket = mockWebSocketClass((ws) => { wsInstance = ws; });
    global.WebSocket.CONNECTING = 0;
    global.WebSocket.OPEN = 1;

    const { result } = renderHook(() => useChatWebSocket('channel-1', 'user-1'), { wrapper });
    await new Promise(resolve => setTimeout(resolve, 50));
    
    wsInstance._simulateOpen();

    await act(async () => {
      await result.current.sendMessageWs('test message');
    });

    expect(wsInstance.send).toHaveBeenCalled();
    const sentData = JSON.parse(wsInstance.send.mock.calls[0][0]);
    expect(sentData.content).toBe('test message');
    expect(sentData.authorId).toBe('user-1');
  });

  it('should queue and send message if CONNECTING', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    let wsInstance: MockWebSocket;
    global.WebSocket = mockWebSocketClass((ws) => { wsInstance = ws; });
    global.WebSocket.CONNECTING = 0;
    global.WebSocket.OPEN = 1;

    const { result } = renderHook(() => useChatWebSocket('channel-1', 'user-1'), { wrapper });
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(wsInstance.readyState).toBe(0);

    const sendPromise = act(async () => {
      return result.current.sendMessageWs('queued message');
    });

    setTimeout(() => {
      wsInstance._simulateOpen();
    }, 10);

    await sendPromise;

    expect(wsInstance.send).toHaveBeenCalled();
    const sentData = JSON.parse(wsInstance.send.mock.calls[0][0]);
    expect(sentData.content).toBe('queued message');
  });
});
