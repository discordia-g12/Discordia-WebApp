import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useMessageActions } from '../useMessageActions';
import type { Message } from '../../../types';
import * as core from '@discordia/core';
import * as uiStore from '../../../app/uiStore';

vi.mock('../chatConnectionContext', () => ({
  useSendChannelMessage: () => vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../profile/currentUserStore', () => ({
  useCurrentUser: () => ({ id: 'user-me', username: 'me', displayName: 'Me' }),
}));

vi.mock('../../../app/uiStore', () => ({
  showToast: vi.fn(),
}));

describe('useMessageActions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const initialMessages: Message[] = [
    {
      id: 'm1',
      content: 'Hola mundo',
      authorId: 'user-other',
      channelId: 'ch-1',
      timestamp: '2026-11-09T10:00:00Z',
      reactions: [
        { emoji: '👍', count: 1, users: ['user-other'] },
      ],
    },
  ];

  it('toggleReaction agrega una reacción optimista y llama a la API', async () => {
    const spyToggle = vi.spyOn(core, 'toggleReaction').mockResolvedValue({
      id: 'm1',
      content: 'Hola mundo',
      authorId: 'user-other',
      channelId: 'ch-1',
      timestamp: '2026-11-09T10:00:00Z',
      reactions: [
        { emoji: '👍', count: 1, users: ['user-other'] },
        { emoji: '🔥', count: 1, users: ['user-me'], reacted: true, hasReacted: true },
      ],
    } as Message);

    queryClient.setQueryData(['messages', 'ch-1'], { pages: [initialMessages], pageParams: [undefined] });

    const { result } = renderHook(() => useMessageActions('ch-1'), { wrapper });

    await act(async () => {
      await result.current.toggleReaction('m1', '🔥');
    });

    expect(spyToggle).toHaveBeenCalledWith('ch-1', 'm1', '🔥');

    const updated = queryClient.getQueryData<{ pages: Message[][] }>(['messages', 'ch-1']);
    const list = updated?.pages[0] || [];
    expect(list[0].reactions).toHaveLength(2);
    expect(list[0].reactions?.find((r) => r.emoji === '🔥')?.count).toBe(1);
  });

  it('toggleReaction retira una reacción propia si ya existía (toggle OFF)', async () => {
    const existingWithMe: Message[] = [
      {
        id: 'm1',
        content: 'Hola mundo',
        authorId: 'user-other',
        channelId: 'ch-1',
        timestamp: '2026-11-09T10:00:00Z',
        reactions: [
          { emoji: '👍', count: 2, users: ['user-other', 'user-me'], reacted: true, hasReacted: true },
        ],
      },
    ];

    const spyToggle = vi.spyOn(core, 'toggleReaction').mockResolvedValue({
      id: 'm1',
      content: 'Hola mundo',
      authorId: 'user-other',
      channelId: 'ch-1',
      timestamp: '2026-11-09T10:00:00Z',
      reactions: [
        { emoji: '👍', count: 1, users: ['user-other'], reacted: false, hasReacted: false },
      ],
    } as Message);

    queryClient.setQueryData(['messages', 'ch-1'], { pages: [existingWithMe], pageParams: [undefined] });

    const { result } = renderHook(() => useMessageActions('ch-1'), { wrapper });

    await act(async () => {
      await result.current.toggleReaction('m1', '👍');
    });

    expect(spyToggle).toHaveBeenCalledWith('ch-1', 'm1', '👍');

    const updated = queryClient.getQueryData<{ pages: Message[][] }>(['messages', 'ch-1']);
    const list = updated?.pages[0] || [];
    expect(list[0].reactions?.find((r) => r.emoji === '👍')?.count).toBe(1);
  });

  it('toggleReaction hace rollback y muestra toast en caso de error de la API', async () => {
    vi.spyOn(core, 'toggleReaction').mockRejectedValue(new Error('No tenés permiso para agregar reacciones'));

    queryClient.setQueryData(['messages', 'ch-1'], { pages: [initialMessages], pageParams: [undefined] });

    const { result } = renderHook(() => useMessageActions('ch-1'), { wrapper });

    await act(async () => {
      await result.current.toggleReaction('m1', '🔥');
    });

    expect(uiStore.showToast).toHaveBeenCalledWith('No tenés permiso para agregar reacciones', 'danger');

    const updated = queryClient.getQueryData<{ pages: Message[][] }>(['messages', 'ch-1']);
    const list = updated?.pages[0] || [];
    // Debe haber vuelto al estado previo (solo 👍)
    expect(list[0].reactions).toEqual([{ emoji: '👍', count: 1, users: ['user-other'] }]);
  });
});
