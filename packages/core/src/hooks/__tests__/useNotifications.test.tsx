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
import {
  notificationPreferencesQueryKey,
  notificationsQueryKey,
  useMarkNotificationRead,
  useNotificationPreference,
  useThreadMute,
} from '../useNotifications';

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

describe('useNotificationPreference', () => {
  const serverPref: NotificationPreference = {
    scopeType: 'server',
    scopeId: 's1',
    serverId: 's1',
    level: 'all',
    muted: false,
    mutedUntil: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.mocked(getNotificationPreferences).mockReset().mockResolvedValue([serverPref]);
    vi.mocked(setNotificationPreference).mockReset();
  });

  it('un canal sin nivel propio hereda del servidor', async () => {
    const { result } = renderHook(
      () => useNotificationPreference({ scopeType: 'channel', serverId: 's1', channelId: 'c1' }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.level).toBeNull();
    expect(result.current.inherited).toEqual({ level: 'all', muted: false });
    expect(result.current.effective).toEqual({ level: 'all', muted: false });
  });

  it('un servidor hereda el default, no su propia fila', async () => {
    const { result } = renderHook(() => useNotificationPreference({ scopeType: 'server', serverId: 's1' }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.level).toBe('all');
    expect(result.current.inherited).toEqual({ level: 'mentions', muted: false });
  });

  it('un DM es un canal con serverId null: hereda "all" y no manda serverId', async () => {
    vi.mocked(getNotificationPreferences).mockResolvedValue([]);
    vi.mocked(setNotificationPreference).mockImplementation(async (scopeType, scopeId, change) => ({
      ...serverPref,
      scopeType,
      scopeId,
      serverId: null,
      level: change.level ?? null,
    }));
    const { result } = renderHook(
      () => useNotificationPreference({ scopeType: 'channel', serverId: null, channelId: 'dm-a-b' }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.inherited.level).toBe('all');

    await act(() => result.current.setLevel('mentions'));

    expect(setNotificationPreference).toHaveBeenCalledWith('channel', 'dm-a-b', { level: 'mentions' });
    await waitFor(() => expect(result.current.effective.level).toBe('mentions'));
  });

  it('el cambio es optimista y vuelve atrás si falla', async () => {
    let reject!: (err: Error) => void;
    vi.mocked(setNotificationPreference).mockReturnValue(new Promise((_, r) => (reject = r)));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => useNotificationPreference({ scopeType: 'thread', serverId: 's1', channelId: 'c1', threadId: 't1' }),
      { wrapper: wrapperWith(client) }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let saving!: Promise<unknown>;
    act(() => {
      saving = result.current.setMuted(true, '2999-01-01T00:00:00.000Z').catch(() => undefined);
    });
    await waitFor(() => expect(result.current.muted).toBe(true));
    expect(result.current.effective.muted).toBe(true);
    expect(setNotificationPreference).toHaveBeenCalledWith('thread', 't1', {
      muted: true,
      mutedUntil: '2999-01-01T00:00:00.000Z',
      serverId: 's1',
    });

    await act(async () => {
      reject(new Error('500'));
      await saving;
    });
    expect(client.getQueryData(notificationPreferencesQueryKey)).toEqual([serverPref]);
    await waitFor(() => expect(result.current.muted).toBe(false));
  });
});
