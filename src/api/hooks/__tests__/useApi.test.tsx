import { renderHook, waitFor, act } from '@testing-library/react';
import { useChannelMessagesQuery, useServersQuery, useCreateServerMutation } from '../useApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../messages', () => ({
  getMessages: vi.fn().mockResolvedValue([
    { id: '1', content: 'hello', authorId: 'user-1' }
  ])
}));

vi.mock('../../servers', () => ({
  getServers: vi.fn().mockResolvedValue([
    { id: 's1', name: 'Test Server', channels: [] }
  ]),
  createServer: vi.fn().mockResolvedValue({ id: 's2', name: 'New Server' }),
}));

vi.mock('../../../auth/session', () => ({
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
    it('should fetch messages and inject author info for current user', async () => {
      const { result } = renderHook(() => useChannelMessagesQuery('channel-1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data![0].author).toBeDefined();
      expect(result.current.data![0].author!.id).toBe('user-1');
      expect(result.current.data![0].author!.displayName).toBe('Test User');
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
