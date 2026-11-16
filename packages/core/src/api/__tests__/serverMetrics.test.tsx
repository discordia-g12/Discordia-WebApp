import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../../auth/session';
import { configureClient } from '../client';
import { ApiError } from '../errors';
import {
  exportServerActivityMetricsCsv,
  isServerMetricsForbidden,
  serverMetricsCsvFilename,
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

describe('Exportación de métricas a CSV', () => {
  const fetchMock = vi.fn();
  const CSV = 'fecha,miembros_activos,mensajes_enviados,nuevos_miembros\r\n2026-11-10,6,15,2\r\n';

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'jwt', onAuthFailure: () => {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('pide format=csv con el período y devuelve el texto con el nombre del archivo', async () => {
    fetchMock.mockResolvedValue(new Response(CSV, { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8' } }));

    const file = await exportServerActivityMetricsCsv(
      SERVER_ID,
      { from: '2026-11-10T00:00:00.000Z', to: '2026-11-13T00:00:00.000Z' },
      'Mi Servidor Ñandú',
    );

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `http://api.test/api/v1/servers/${SERVER_ID}/metrics?from=2026-11-10T00%3A00%3A00.000Z&to=2026-11-13T00%3A00%3A00.000Z&format=csv`,
    );
    expect(file).toEqual({ filename: 'metricas-mi-servidor-nandu-2026-11-10_2026-11-12.csv', content: CSV });
  });

  it('propaga el 503 del backend (fuente caída) como ApiError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { type: 'about:blank', title: 'Service Unavailable', status: 503, detail: 'Probá exportar de nuevo en unos minutos.' },
        503,
        'application/problem+json',
      ),
    );

    const err = await exportServerActivityMetricsCsv(SERVER_ID, { days: 7 }, 'srv').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(serverMetricsErrorMessage(err)).toBe('Probá exportar de nuevo en unos minutos.');
  });

  it('serverMetricsCsvFilename usa los días incluidos y un nombre seguro', () => {
    const now = new Date('2026-11-15T15:00:00.000Z');
    expect(serverMetricsCsvFilename('Gamers!!', { days: 7 }, now)).toBe('metricas-gamers-2026-11-08_2026-11-15.csv');
    expect(serverMetricsCsvFilename('¿¿??', { from: '2026-11-01T00:00:00.000Z', to: '2026-11-02T00:00:00.000Z' })).toBe(
      'metricas-servidor-2026-11-01_2026-11-01.csv',
    );
  });
});
