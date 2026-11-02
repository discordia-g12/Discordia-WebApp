import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ChannelUnread } from '../../api/readStates';
import { markAllRead, markChannelRead } from '../../api/readStates';
import type { Channel, Server } from '../../types';
import {
  MARK_READ_DEBOUNCE_MS,
  applyUnread,
  unreadQueryKey,
  useAutoMarkChannelRead,
  useMarkAllReadMutation,
  useMarkChannelReadMutation,
} from '../useUnread';

vi.mock('../../api/readStates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/readStates')>()),
  getUnread: vi.fn().mockResolvedValue([]),
  markChannelRead: vi.fn().mockResolvedValue(undefined),
  markAllRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../auth/session', () => ({
  useSession: vi.fn().mockImplementation((selector) => selector({ status: 'authenticated' })),
}));

const unread = (channelId: string, unreadCount: number, mentionCount = 0): ChannelUnread => ({
  channelId,
  unreadCount,
  mentionCount,
});

const channel = (id: string, categoryId: string | null = 'cat'): Channel =>
  ({ id, name: id, type: 'text', categoryId }) as Channel;

function server(id: string, channels: Channel[]): Server {
  return {
    id,
    name: id,
    ownerId: 'o',
    channels,
    categories: [{ id: 'cat', name: 'cat', channels: channels.filter((c) => c.categoryId === 'cat') }],
    roles: [],
    members: [],
    boostLevel: 0,
    boostCount: 0,
  };
}

describe('applyUnread', () => {
  const servers = [server('s1', [channel('a'), channel('b')]), server('s2', [channel('c')])];

  it('pone el contador en cada canal (en la lista y en su categoría) y el total en el servidor', () => {
    const [s1, s2] = applyUnread(servers, [unread('a', 3), unread('b', 2, 1)]);

    expect(s1.channels?.map((c) => c.unreadCount)).toEqual([3, 2]);
    expect(s1.categories[0].channels.map((c) => c.unreadCount)).toEqual([3, 2]);
    expect(s1.categories[0].channels[1].mentions).toBe(1);
    // El mismo objeto en las dos listas
    expect(s1.categories[0].channels[0]).toBe(s1.channels?.[0]);
    expect(s1).toMatchObject({ unreadCount: 5, unread: true, mentions: 1 });
    expect(s2).toMatchObject({ unreadCount: 0, unread: false, mentions: 0 });
  });

  it('el canal abierto nunca cuenta como no leído', () => {
    const [s1] = applyUnread(servers, [unread('a', 3), unread('b', 2)], 'a');

    expect(s1.channels?.[0].unreadCount).toBe(0);
    expect(s1.unreadCount).toBe(2);
  });

  it('sin datos todavía, todo queda en 0 y no cambia los servidores originales', () => {
    const [s1] = applyUnread(servers, undefined);

    expect(s1.unread).toBe(false);
    expect(servers[0].channels?.[0].unreadCount).toBeUndefined();
  });
});

describe('hooks de no leídos', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marcar un canal lo saca de los no leídos al momento', async () => {
    queryClient.setQueryData(unreadQueryKey, [unread('a', 3), unread('b', 1)]);
    const { result } = renderHook(() => useMarkChannelReadMutation(), { wrapper });

    await act(async () => {
      result.current.mutate({ channelId: 'a', messageId: 'm1' });
    });

    expect(queryClient.getQueryData(unreadQueryKey)).toEqual([unread('b', 1)]);
    expect(markChannelRead).toHaveBeenCalledWith('a', 'm1');
  });

  it('si falla, el canal vuelve a los no leídos', async () => {
    vi.mocked(markChannelRead).mockRejectedValueOnce(new Error('sin red'));
    queryClient.setQueryData(unreadQueryKey, [unread('a', 3)]);
    const { result } = renderHook(() => useMarkChannelReadMutation(), { wrapper });

    await act(async () => {
      result.current.mutate({ channelId: 'a' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryClient.getQueryData(unreadQueryKey)).toEqual([unread('a', 3)]);
  });

  it('marcar todo vacía los no leídos y después los vuelve a pedir', async () => {
    queryClient.setQueryData(unreadQueryKey, [unread('a', 3), unread('b', 1)]);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useMarkAllReadMutation(), { wrapper });

    await act(async () => {
      result.current.mutate();
    });

    expect(queryClient.getQueryData(unreadQueryKey)).toEqual([]);
    expect(markAllRead).toHaveBeenCalled();
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: unreadQueryKey }));
  });

  it('marca el canal abierto una sola vez por ráfaga de mensajes, con el último', async () => {
    vi.useFakeTimers();
    const { rerender } = renderHook(({ last }) => useAutoMarkChannelRead('a', last), {
      wrapper,
      initialProps: { last: 'm1' },
    });

    rerender({ last: 'm2' });
    rerender({ last: 'm3' });
    await act(async () => {
      vi.advanceTimersByTime(MARK_READ_DEBOUNCE_MS);
    });

    expect(markChannelRead).toHaveBeenCalledTimes(1);
    expect(markChannelRead).toHaveBeenCalledWith('a', 'm3');

    // El mismo último mensaje no se vuelve a marcar
    rerender({ last: 'm3' });
    await act(async () => {
      vi.advanceTimersByTime(MARK_READ_DEBOUNCE_MS);
    });
    expect(markChannelRead).toHaveBeenCalledTimes(1);
  });

  it('con la app en segundo plano no marca nada; al volver, sí', async () => {
    vi.useFakeTimers();
    const { rerender } = renderHook(({ enabled }) => useAutoMarkChannelRead('a', 'm1', { enabled }), {
      wrapper,
      initialProps: { enabled: false },
    });

    await act(async () => {
      vi.advanceTimersByTime(MARK_READ_DEBOUNCE_MS * 2);
    });
    expect(markChannelRead).not.toHaveBeenCalled();

    rerender({ enabled: true });
    await act(async () => {
      vi.advanceTimersByTime(MARK_READ_DEBOUNCE_MS);
    });
    expect(markChannelRead).toHaveBeenCalledWith('a', 'm1');
  });

  it('sin mensajes no marca nada', async () => {
    vi.useFakeTimers();
    renderHook(() => useAutoMarkChannelRead('a', undefined), { wrapper });

    await act(async () => {
      vi.advanceTimersByTime(MARK_READ_DEBOUNCE_MS * 2);
    });
    expect(markChannelRead).not.toHaveBeenCalled();
  });
});
