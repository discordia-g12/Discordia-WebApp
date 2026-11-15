import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../../auth/session';
import { configureClient } from '../client';
import { ApiError } from '../errors';
import {
  isServerMetricsForbidden,
  normalizeServerActivityMetrics,
  serverMetricsErrorMessage,
  useServerActivityMetricsQuery,
} from '../serverMetrics';

const SERVER_ID = '11111111-1111-4111-8111-111111111111';

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

describe('serverMetrics helpers', () => {
  it('normaliza respuestas inesperadas o parciales sin romper', () => {
    expect(normalizeServerActivityMetrics([])).toEqual({
      serverId: '',
      from: '',
      to: '',
      activeMembers: 0,
      messagesSent: 0,
      newMembers: 0,
      hasActivity: false,
      partial: false,
      series: [],
    });

    const partial = normalizeServerActivityMetrics({
      serverId: SERVER_ID,
      from: '2026-11-01T00:00:00.000Z',
      to: '2026-11-03T00:00:00.000Z',
      activeMembers: null,
      messagesSent: null,
      newMembers: 3,
      hasActivity: true,
      partial: true,
      series: [{ date: '2026-11-01', activeMembers: null, messagesSent: null, newMembers: 3 }],
    });
    expect(partial.partial).toBe(true);
    expect(partial.activeMembers).toBeNull();
    expect(partial.newMembers).toBe(3);
  });

  it('traduce mensajes de error HTTP clave', () => {
    const err403 = new ApiError({ status: 403 });
    expect(isServerMetricsForbidden(err403)).toBe(true);
    expect(serverMetricsErrorMessage(err403)).toMatch(/permisos de administración/);
    expect(serverMetricsErrorMessage(new ApiError({ status: 401 }))).toMatch(/sesión expiró/);
    expect(serverMetricsErrorMessage(new ApiError({ status: 404 }))).toMatch(/no existe/);
  });
});

describe('useServerActivityMetricsQuery', () => {
  const fetchMock = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'jwt-token', onAuthFailure: () => {} });
    useSession.setState({ status: 'authenticated' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('consulta /api/v1/servers/:id/metrics con days o con from/to', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        serverId: SERVER_ID,
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-08T00:00:00.000Z',
        activeMembers: 8,
        messagesSent: 34,
        newMembers: 2,
        hasActivity: true,
        partial: false,
        series: [{ date: '2026-11-07', activeMembers: 8, messagesSent: 34, newMembers: 2 }],
      }),
    );

    const { result } = renderHook(
      () => useServerActivityMetricsQuery(SERVER_ID, { from: '2026-11-01T00:00:00.000Z', to: '2026-11-08T00:00:00.000Z' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.messagesSent).toBe(34);
    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe(`/api/v1/servers/${SERVER_ID}/metrics`);
    expect(parsed.searchParams.get('from')).toBe('2026-11-01T00:00:00.000Z');
    expect(parsed.searchParams.get('to')).toBe('2026-11-08T00:00:00.000Z');
    expect(init.headers.Authorization).toBe('Bearer jwt-token');
  });

  it('no reintenta un 403 de permisos insuficientes', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { type: 'about:blank', title: 'Forbidden', status: 403, detail: 'missing admin perms' },
        403,
        'application/problem+json',
      ),
    );

    const { result } = renderHook(() => useServerActivityMetricsQuery(SERVER_ID, { days: 30 }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(isServerMetricsForbidden(result.current.error)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
