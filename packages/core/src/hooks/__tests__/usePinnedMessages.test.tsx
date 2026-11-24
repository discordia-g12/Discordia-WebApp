import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPinnedMessages, setMessagePinned } from '../../api/messages';
import { ApiError } from '../../api/errors';
import type { Message } from '../../types';
import { flattenMessagePages, messagesQueryKey, pinnedMessagesQueryKey, type MessagePages } from '../messageCache';
import { usePinMessage, usePinnedMessagesQuery } from '../usePinnedMessages';

vi.mock('../../auth/session', () => ({
  useSession: vi.fn().mockImplementation((selector) => selector({ status: 'authenticated' })),
}));

vi.mock('../../api/messages', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/messages')>()),
  setMessagePinned: vi.fn(),
  getPinnedMessages: vi.fn(),
}));

const message: Message = { id: 'm1', content: 'hola', authorId: 'u1', channelId: 'c1', timestamp: '', isPinned: false };

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData<MessagePages>(messagesQueryKey('c1'), { pages: [[message]], pageParams: [undefined] });
  queryClient.setQueryData<Message[]>(pinnedMessagesQueryKey('c1'), []);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const history = () => flattenMessagePages(queryClient.getQueryData<MessagePages>(messagesQueryKey('c1'))!);
  const pins = () => queryClient.getQueryData<Message[]>(pinnedMessagesQueryKey('c1'))!;
  return { queryClient, wrapper, history, pins };
}

describe('usePinnedMessagesQuery', () => {
  it('pide los fijados del canal', async () => {
    vi.mocked(getPinnedMessages).mockResolvedValue([{ ...message, isPinned: true }]);
    const { wrapper } = setup();
    const { result } = renderHook(() => usePinnedMessagesQuery('dm-9'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getPinnedMessages).toHaveBeenCalledWith('dm-9');
  });
});

describe('usePinMessage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fija de forma optimista y después queda lo que confirmó el servidor', async () => {
    let resolve!: (m: Message) => void;
    vi.mocked(setMessagePinned).mockReturnValue(new Promise((r) => (resolve = r)));
    const onPinStateChange = vi.fn();
    const { wrapper, history, pins } = setup();
    const { result } = renderHook(() => usePinMessage('c1', { onPinStateChange }), { wrapper });

    let done!: Promise<void>;
    act(() => {
      done = result.current(message);
    });
    expect(history()[0].isPinned).toBe(true);
    expect(pins().map((m) => m.id)).toEqual(['m1']);
    expect(setMessagePinned).toHaveBeenCalledWith('c1', 'm1', true);

    await act(async () => {
      resolve({ ...message, isPinned: true, pinnedAt: '2026-11-01T00:00:00.000Z', pinnedBy: 'u2' });
      await done;
    });
    expect(history()[0]).toMatchObject({ isPinned: true, pinnedBy: 'u2' });
    expect(onPinStateChange).toHaveBeenLastCalledWith('m1', { isPinned: true, pinnedAt: '2026-11-01T00:00:00.000Z', pinnedBy: 'u2' });
  });

  it('si el servidor lo rechaza vuelve atrás y avisa el límite', async () => {
    vi.mocked(setMessagePinned).mockRejectedValue(new ApiError({ status: 409 }));
    const onPinStateChange = vi.fn();
    const { wrapper, history, pins } = setup();
    const { result } = renderHook(() => usePinMessage('c1', { onPinStateChange }), { wrapper });

    await act(async () => {
      await expect(result.current(message)).rejects.toThrow('Ya hay 50 mensajes fijados');
    });
    expect(history()[0].isPinned).toBe(false);
    expect(pins()).toEqual([]);
    expect(onPinStateChange).toHaveBeenLastCalledWith('m1', { isPinned: false, pinnedAt: null, pinnedBy: null });
  });

  it('desfija un mensaje fijado', async () => {
    const pinnedMessage = { ...message, isPinned: true, pinnedAt: '2026-11-01T00:00:00.000Z' };
    vi.mocked(setMessagePinned).mockResolvedValue({ ...message, isPinned: false, pinnedAt: null });
    const { queryClient, wrapper, pins } = setup();
    queryClient.setQueryData<Message[]>(pinnedMessagesQueryKey('c1'), [pinnedMessage]);
    const { result } = renderHook(() => usePinMessage('c1'), { wrapper });

    await act(() => result.current(pinnedMessage));

    expect(setMessagePinned).toHaveBeenCalledWith('c1', 'm1', false);
    expect(pins()).toEqual([]);
  });
});
