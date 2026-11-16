import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureClient } from '../../api/client';
import { useSession } from '../../auth/session';
import type { Channel, Role } from '../../types';
import { roleMention, useChannelOverridesAdmin } from '../channelOverrides';

const SEND = 1 << 9;
const role: Role = { id: 'r1', name: 'Habla', color: '#fff', permissions: [] };
const channels: Channel[] = [
  { id: 'c1', name: 'general', type: 'text' },
  { id: 'c2', name: 'Voz General', type: 'voice' },
];
const base = 'http://localhost:8000/api/v1/servers/s1/channels';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
let saved: Record<string, unknown[]>;

function renderAdmin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useChannelOverridesAdmin('s1', role, channels), { wrapper });
}

describe('useChannelOverridesAdmin', () => {
  beforeEach(() => {
    saved = { c1: [], c2: [] };
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const channel = url.slice(base.length + 1).split('/')[0];
      if (init?.method === 'PUT') {
        const body = JSON.parse(String(init.body));
        saved[channel] = [{ channel_id: channel, role_id: 'r1', ...body }];
        return json(saved[channel][0]);
      }
      if (init?.method === 'DELETE') {
        saved[channel] = [];
        return new Response(null, { status: 204 });
      }
      return json(saved[channel]);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    configureClient({ baseUrl: 'http://localhost:8000', getToken: async () => 'tok', onAuthFailure: vi.fn(), timeoutMs: 1000 });
    useSession.setState({ status: 'authenticated' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useSession.setState({ status: 'bootstrapping' });
  });

  it('arranca en el primer canal con lo guardado y los permisos de su tipo', async () => {
    saved.c1 = [{ channel_id: 'c1', role_id: 'r1', allow_bitmask: 0, deny_bitmask: SEND }];
    const { result } = renderAdmin();

    await waitFor(() => expect(result.current.overridesQuery.isSuccess).toBe(true));
    expect(result.current.channel?.id).toBe('c1');
    expect(result.current.hasOverride).toBe(true);
    expect(result.current.stateOf('SEND_MESSAGES')).toBe('deny');
    expect(result.current.stateOf('ATTACH_FILES')).toBe('inherit');
    expect(result.current.permissions.map((p) => p.id)).toContain('SEND_MESSAGES');
    expect(result.current.dirty).toBe(false);
  });

  it('guarda el borrador con PUT y avisa', async () => {
    const { result } = renderAdmin();
    await waitFor(() => expect(result.current.overridesQuery.isSuccess).toBe(true));

    act(() => result.current.setState('SEND_MESSAGES', 'allow'));
    expect(result.current.dirty).toBe(true);
    await act(() => result.current.handleSave());

    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(String(put[0])).toBe(`${base}/c1/permissions/roles/r1`);
    expect(JSON.parse(String(put[1].body))).toEqual({ allow_bitmask: SEND, deny_bitmask: 0 });
    expect(result.current.notice).toBe('Se guardaron los permisos de @Habla en •general.');
    await waitFor(() => expect(result.current.hasOverride).toBe(true));
    expect(result.current.dirty).toBe(false);
  });

  it('si el borrador queda vacío, guardar borra la excepción', async () => {
    saved.c1 = [{ channel_id: 'c1', role_id: 'r1', allow_bitmask: 0, deny_bitmask: SEND }];
    const { result } = renderAdmin();
    await waitFor(() => expect(result.current.hasOverride).toBe(true));

    act(() => result.current.setState('SEND_MESSAGES', 'inherit'));
    await act(() => result.current.handleSave());

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });

  it('cambiar de canal descarta el borrador y muestra los permisos de voz', async () => {
    const { result } = renderAdmin();
    await waitFor(() => expect(result.current.overridesQuery.isSuccess).toBe(true));
    act(() => result.current.setState('SEND_MESSAGES', 'deny'));

    act(() => result.current.selectChannel('c2'));

    expect(result.current.dirty).toBe(false);
    expect(result.current.permissions.map((p) => p.id)).toContain('CONNECT');
    expect(result.current.permissions.map((p) => p.id)).not.toContain('SEND_MESSAGES');
  });

  it('muestra el error del backend si no tiene permisos', async () => {
    const { result } = renderAdmin();
    await waitFor(() => expect(result.current.overridesQuery.isSuccess).toBe(true));
    fetchMock.mockImplementation(async () => json({ detail: 'forbidden' }, 403));

    act(() => result.current.setState('SEND_MESSAGES', 'deny'));
    await act(() => result.current.handleSave());

    expect(result.current.error).toBe('No tenés permisos para cambiar los permisos de los canales.');
    expect(result.current.dirty).toBe(true);
  });

  it('roleMention no duplica la @ de @everyone', () => {
    expect(roleMention({ name: '@everyone' })).toBe('@everyone');
    expect(roleMention({ name: 'Habla' })).toBe('@Habla');
  });
});
