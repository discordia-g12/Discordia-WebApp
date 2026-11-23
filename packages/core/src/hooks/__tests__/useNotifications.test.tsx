import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getNotificationPreferences,
  markNotificationRead,
  setNotificationPreference,
  type NotificationPreference,
} from '../../api/notifications';
import { notificationsQueryKey, useMarkNotificationRead, useThreadMute } from '../useNotifications';

vi.mock('../../auth/session', () => ({
  useSession: vi.fn().mockImplementation((selector) => selector({ status: 'authenticated' })),
}));

vi.mock('../../api/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/notifications')>()),
  getNotificationPreferences: vi.fn(),
  setNotificationPreference: vi.fn(),
  markNotificationRead: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function wrapperWith(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const expired: NotificationPreference = {
  scopeType: 'thread',
  scopeId: 't1',
  serverId: 's1',
  level: null,
  muted: true,
  mutedUntil: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

describe('useThreadMute', () => {
  beforeEach(() => {
    vi.mocked(getNotificationPreferences).mockReset().mockResolvedValue([expired]);
    vi.mocked(setNotificationPreference).mockReset();
  });

  it('silenciar un hilo con un silencio vencido lo silencia sin fecha de fin', async () => {
    // El servidor tarda: se ve el estado optimista
    vi.mocked(setNotificationPreference).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useThreadMute('t1', 's1'), { wrapper });
    await waitFor(() => expect(vi.mocked(getNotificationPreferences)).toHaveBeenCalled());
    expect(result.current.muted).toBe(false);

    act(() => {
      void result.current.setMuted(true);
    });

    await waitFor(() => expect(result.current.muted).toBe(true));
    expect(setNotificationPreference).toHaveBeenCalledWith('thread', 't1', { muted: true, mutedUntil: null, serverId: 's1' });
  });
});

describe('useMarkNotificationRead', () => {
  it('cancela un refetch en vuelo antes del cambio optimista, para que no lo pise', async () => {
    vi.mocked(markNotificationRead).mockResolvedValue(undefined);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const cancel = vi.spyOn(client, 'cancelQueries');
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: wrapperWith(client) });

    await act(() => result.current.mutateAsync('n1'));

    expect(cancel).toHaveBeenCalledWith({ queryKey: notificationsQueryKey });
  });
});
