import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resolvePushDestination } from '@discordia/core';
import { useUIStore } from '../../../app/uiStore';
import { usePushNavigation } from '../usePushNavigation';

vi.mock('@discordia/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@discordia/core')>()),
  resolvePushDestination: vi.fn(),
}));

const DATA = { notificationId: 'n1', reason: 'mention', serverId: 's1', channelId: 'c1', threadId: 't1', messageId: 'm1' };
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.mocked(resolvePushDestination).mockResolvedValue({ kind: 'channel', serverId: 's1', channelId: 'c1', threadId: 't1', messageId: 'm1' });
});
afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

describe('usePushNavigation', () => {
  it('con ?push= abre la conversación y limpia la URL', async () => {
    window.history.replaceState(null, '', '/?push=' + encodeURIComponent(JSON.stringify(DATA)));
    renderHook(() => usePushNavigation(), { wrapper });
    expect(window.location.search).toBe('');
    await waitFor(() => expect(useUIStore.getState().selectedChannelId).toBe('c1'));
    expect(resolvePushDestination).toHaveBeenCalledWith(expect.anything(), DATA);
    expect(useUIStore.getState().selectedServerId).toBe('s1');
    expect(useUIStore.getState().openThread).toMatchObject({ channelId: 'c1', messageId: 't1' });
  });

  it('un ?push= roto no navega', () => {
    window.history.replaceState(null, '', '/?push=%7Broto');
    renderHook(() => usePushNavigation(), { wrapper });
    expect(resolvePushDestination).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('navega con el mensaje push-open del service worker', async () => {
    const target = new EventTarget();
    vi.stubGlobal('PushManager', class {});
    vi.stubGlobal('Notification', { permission: 'granted' });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: target });
    useUIStore.getState().setSelectedChannelId(null);
    renderHook(() => usePushNavigation(), { wrapper });
    target.dispatchEvent(new MessageEvent('message', { data: { type: 'push-open', data: DATA } }));
    await waitFor(() => expect(useUIStore.getState().selectedChannelId).toBe('c1'));
  });
});
