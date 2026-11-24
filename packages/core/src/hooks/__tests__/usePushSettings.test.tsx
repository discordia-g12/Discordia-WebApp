import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getConversations } from '../../api/conversations';
import { getPushSettings, setPushSettings } from '../../api/push';
import { conversationsQueryKey } from '../inboxCache';
import { pushSettingsQueryKey, resolvePushDestination, usePushSettings } from '../usePushSettings';

vi.mock('../../auth/session', () => ({
  useSession: vi.fn().mockImplementation((selector) => selector({ status: 'authenticated' })),
}));

vi.mock('../../api/push', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/push')>()),
  getPushSettings: vi.fn(),
  setPushSettings: vi.fn(),
}));

vi.mock('../../api/conversations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/conversations')>()),
  getConversations: vi.fn(),
}));

function wrapperWith(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('usePushSettings', () => {
  beforeEach(() => {
    vi.mocked(getPushSettings).mockReset().mockResolvedValue({ pushEnabled: true });
    vi.mocked(setPushSettings).mockReset();
  });

  it('el cambio es optimista y vuelve atrás si falla', async () => {
    let reject!: (err: Error) => void;
    vi.mocked(setPushSettings).mockReturnValue(new Promise((_, r) => (reject = r)));
    const client = newClient();
    const { result } = renderHook(() => usePushSettings(), { wrapper: wrapperWith(client) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.pushEnabled).toBe(true);

    let saving!: Promise<unknown>;
    act(() => {
      saving = result.current.setPushEnabled(false);
    });
    await waitFor(() => expect(result.current.pushEnabled).toBe(false));
    expect(vi.mocked(setPushSettings)).toHaveBeenCalledWith({ pushEnabled: false });

    await act(async () => {
      reject(new Error('500'));
      await expect(saving).rejects.toThrow('500');
    });
    await waitFor(() => expect(result.current.pushEnabled).toBe(true));
  });

  it('se queda con lo que devuelve el servidor', async () => {
    vi.mocked(setPushSettings).mockResolvedValue({ pushEnabled: false });
    const client = newClient();
    const { result } = renderHook(() => usePushSettings(), { wrapper: wrapperWith(client) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.setPushEnabled(false));
    expect(client.getQueryData(pushSettingsQueryKey)).toEqual({ pushEnabled: false });
  });
});

describe('resolvePushDestination', () => {
  const dm = { notificationId: 'n1', reason: 'dm', serverId: null, channelId: 'dm-abc', threadId: null, messageId: 'm1' };

  // Con llaves: beforeEach toma una función devuelta como limpieza, y mockReset devuelve el mock
  beforeEach(() => {
    vi.mocked(getConversations).mockReset();
  });

  it('un DM en el caché no pide nada', async () => {
    const client = newClient();
    client.setQueryData(conversationsQueryKey, [{ id: 'dm-abc', otherUserId: 'u2' }]);
    expect(await resolvePushDestination(client, dm)).toMatchObject({ kind: 'dm', userId: 'u2' });
    expect(vi.mocked(getConversations)).not.toHaveBeenCalled();
  });

  it('sin caché (app cerrada) pide las conversaciones', async () => {
    vi.mocked(getConversations).mockResolvedValue([{ id: 'dm-abc', otherUserId: 'u2' }] as never);
    expect(await resolvePushDestination(newClient(), dm)).toMatchObject({ kind: 'dm', userId: 'u2' });
  });

  it('null si falla o el data no es válido', async () => {
    vi.mocked(getConversations).mockRejectedValue(new Error('red'));
    expect(await resolvePushDestination(newClient(), dm)).toBeNull();
    expect(await resolvePushDestination(newClient(), { nope: true })).toBeNull();
    expect(vi.mocked(getConversations)).toHaveBeenCalledTimes(1);
  });
});
