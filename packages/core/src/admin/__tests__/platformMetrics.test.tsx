import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureClient } from '../../api/client';
import { ApiError } from '../../api/errors';
import { isForbidden } from '../platformStatus';
import {
  customRange,
  formatMetricValue,
  lastDaysRange,
  platformMetricsErrorMessage,
  usePlatformMetricsQuery,
  type PlatformMetrics,
} from '../platformMetrics';

const RANGE = { from: '2026-10-12T00:00:00.000Z', to: '2026-11-11T00:00:00.000Z' };

const METRICS: PlatformMetrics = { ...RANGE, activeUsers: 120, serversCreated: 8, messagesSent: 15432, partial: false };

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

describe('helpers de las métricas', () => {
  it('los últimos N días terminan ahora', () => {
    const now = Date.parse('2026-11-11T12:00:00Z');
    expect(lastDaysRange(7, now)).toEqual({ from: '2026-11-04T12:00:00.000Z', to: '2026-11-11T12:00:00.000Z' });
  });

  it('el rango personalizado incluye el día "hasta" completo', () => {
    const result = customRange('2026-11-01', '2026-11-10');
    expect(result.error).toBeNull();
    expect(result.range).toEqual({
      from: new Date(2026, 10, 1).toISOString(),
      to: new Date(2026, 10, 11).toISOString(),
    });
  });

  it('valida el rango antes de pedir', () => {
    expect(customRange('', '2026-11-10').error).toBe('Elegí las dos fechas.');
    expect(customRange('2026-02-30', '2026-03-10').error).toBe('Elegí las dos fechas.');
    expect(customRange('2026-11-10', '2026-11-10').error).toMatch(/anterior a "hasta"/);
    expect(customRange('2026-11-10', '2026-11-01').error).toMatch(/anterior a "hasta"/);
    // 366 días entran (2025-11-11 al 2026-11-11 inclusive son 366), uno más no
    expect(customRange('2025-11-11', '2026-11-11').error).toBeNull();
    expect(customRange('2025-11-10', '2026-11-11').error).toBe('El período no puede superar los 366 días.');
  });

  it('formatea las cifras y el dato que falta', () => {
    expect(formatMetricValue(15432)).toBe('15.432');
    expect(formatMetricValue(0)).toBe('0');
    expect(formatMetricValue(null)).toBe('sin datos');
  });

  it('explica el error', () => {
    expect(platformMetricsErrorMessage(new ApiError({ status: 403 }))).toMatch(/no tiene permisos de staff/);
    expect(platformMetricsErrorMessage(new ApiError({ status: 401 }))).toMatch(/sesión venció/);
    expect(platformMetricsErrorMessage(new TypeError('x'))).toMatch(/No pudimos consultar las métricas/);
  });
});

describe('usePlatformMetricsQuery', () => {
  const fetchMock = vi.fn();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'token-staff', onAuthFailure: () => {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('pide /api/v1/admin/metrics con from, to y el token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(METRICS));
    const { result } = renderHook(() => usePlatformMetricsQuery(RANGE), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(METRICS);
    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('http://api.test/api/v1/admin/metrics');
    expect(parsed.searchParams.get('from')).toBe(RANGE.from);
    expect(parsed.searchParams.get('to')).toBe(RANGE.to);
    expect(init.headers.Authorization).toBe('Bearer token-staff');
  });

  it('devuelve el resultado parcial tal cual', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...METRICS, activeUsers: null, messagesSent: null, partial: true }));
    const { result } = renderHook(() => usePlatformMetricsQuery(RANGE), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.partial).toBe(true);
    expect(result.current.data?.activeUsers).toBeNull();
    expect(result.current.data?.serversCreated).toBe(8);
  });

  it('sin rango no pide nada', () => {
    const { result } = renderHook(() => usePlatformMetricsQuery(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('un 403 queda como isForbidden, sin reintentar', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ type: 'about:blank', title: 'Forbidden', status: 403, detail: 'staff only' }, 403, 'application/problem+json'),
    );
    const { result } = renderHook(() => usePlatformMetricsQuery(RANGE), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(isForbidden(result.current.error)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
