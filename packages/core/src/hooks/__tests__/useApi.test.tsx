import { renderHook, waitFor, act } from '@testing-library/react';
import { useChannelMessagesQuery, useServersQuery, useCreateServerMutation } from '../useApi';
import { getMessages } from '../../api/messages';
import type { Message } from '../../types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/messages', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/messages')>()),
  getMessages: vi.fn().mockResolvedValue([
    { id: '1', content: 'hello', authorId: 'user-1' }
  ]),
}));

vi.mock('../../api/servers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/servers')>()),
  getServers: vi.fn().mockResolvedValue([
    { id: 's1', name: 'Test Server', channels: [] }
  ]),
  createServer: vi.fn().mockResolvedValue({ id: 's2', name: 'New Server' }),
}));

vi.mock('../../auth/session', () => ({
  useSession: vi.fn().mockImplementation((selector) => {
    return selector({
      status: 'authenticated',
      profile: { id: 'user-1', username: 'testuser', displayName: 'Test User', avatarUrl: 'test.png' }
    });
  })
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('useApi Hooks', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  });

  describe('useChannelMessagesQuery', () => {
    it('should fetch messages without embedding author info (resolved by the UI via authorId)', async () => {
      const { result } = renderHook(() => useChannelMessagesQuery('channel-1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].authorId).toBe('user-1');
      expect(result.current.data![0].author).toBeUndefined();
    });

    it('carga la página anterior con el cursor del mensaje más viejo y la pone arriba', async () => {
      const msg = (id: string) => ({ id, content: id, authorId: 'user-1', channelId: 'channel-1' }) as Message;
      vi.mocked(getMessages)
        .mockResolvedValueOnce([msg('c'), msg('d')])
        .mockResolvedValueOnce([msg('b')]);

      const { result } = renderHook(() => useChannelMessagesQuery('channel-1', { limit: 2 }), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(getMessages).toHaveBeenLastCalledWith('channel-1', { before: undefined, limit: 2 });
      expect(result.current.hasOlder).toBe(true);

      await act(async () => {
        await result.current.fetchOlder();
      });

      expect(getMessages).toHaveBeenLastCalledWith('channel-1', { before: 'c', limit: 2 });
      await waitFor(() => expect(result.current.data!.map((m) => m.id)).toEqual(['b', 'c', 'd']));
      // La página vino incompleta: no hay nada más atrás
      expect(result.current.hasOlder).toBe(false);
    });
  });

  describe('useServersQuery', () => {
    it('should fetch servers when authenticated', async () => {
      const { result } = renderHook(() => useServersQuery(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].name).toBe('Test Server');
    });
  });

  describe('useCreateServerMutation', () => {
    it('should create server and invalidate query', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useCreateServerMutation(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ name: 'New Server' });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['servers'] });
    });
  });
});
