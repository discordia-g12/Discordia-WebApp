import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConversationWith } from '../../api/conversations';
import { UNDELIVERABLE_POLL_MS, useConversationWithQuery, usePresenceQuery } from '../useConversations';
import { getWatchedIds, resetPresenceSync } from '../../realtime/presenceSync';

vi.mock('../../auth/session', () => ({
  useSession: vi.fn().mockImplementation((selector) => selector({ status: 'authenticated' })),
}));

vi.mock('../../api/conversations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/conversations')>()),
  getConversationWith: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useConversationWithQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(getConversationWith).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('recupera el composer cuando a quien estaba bloqueado lo desbloquean', async () => {
    vi.mocked(getConversationWith)
      .mockResolvedValueOnce({ conversation: null, canMessage: false })
      .mockResolvedValue({ conversation: null, canMessage: true });

    const { result } = renderHook(() => useConversationWithQuery('u2'), { wrapper });
    await waitFor(() => expect(result.current.data?.canMessage).toBe(false));

    await act(() => vi.advanceTimersByTimeAsync(UNDELIVERABLE_POLL_MS));
    await waitFor(() => expect(result.current.data?.canMessage).toBe(true));
  });

  it('no pollea mientras se puede escribir', async () => {
    vi.mocked(getConversationWith).mockResolvedValue({ conversation: null, canMessage: true });

    const { result } = renderHook(() => useConversationWithQuery('u2'), { wrapper });
    await waitFor(() => expect(result.current.data?.canMessage).toBe(true));

    await act(() => vi.advanceTimersByTimeAsync(UNDELIVERABLE_POLL_MS * 2));
    expect(getConversationWith).toHaveBeenCalledTimes(1);
  });
});

describe('usePresenceQuery', () => {
  beforeEach(() => resetPresenceSync());

  it('mientras está montado, el inbox sigue a sus ids', () => {
    const { rerender, unmount } = renderHook(({ ids }) => usePresenceQuery(ids), {
      wrapper,
      initialProps: { ids: ['u2', 'u1'] },
    });
    expect(getWatchedIds()).toEqual(['u1', 'u2']);

    rerender({ ids: ['u3'] });
    expect(getWatchedIds()).toEqual(['u3']);

    unmount();
    expect(getWatchedIds()).toEqual([]);
  });
});
