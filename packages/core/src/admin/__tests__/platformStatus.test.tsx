import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureClient } from '../../api/client';
import { ApiError } from '../../api/errors';
import {
  formatLatency,
  formatTimeAgo,
  isForbidden,
  isUnauthorized,
  platformHealthLabel,
  platformStatusErrorMessage,
  serviceErrorText,
  usePlatformStatus,
  type PlatformStatus,
} from '../platformStatus';

const STATUS: PlatformStatus = {
  status: 'degraded',
  checkedAt: '2026-11-03T12:00:00Z',
  services: [
    { id: 'gateway', name: 'API Gateway', status: 'operational', httpStatus: 200, latencyMs: 12, checkedAt: '2026-11-03T12:00:00Z', since: '2026-11-01T00:00:00Z', error: null },
    { id: 'voice', name: 'Voz', status: 'degraded', httpStatus: null, latencyMs: null, checkedAt: '2026-11-03T12:00:00Z', since: '2026-11-03T11:55:00Z', error: 'timeout' },
  ],
};

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

describe('helpers del estado de la plataforma', () => {
  it('etiqueta cada estado en español', () => {
    expect(platformHealthLabel('operational')).toBe('Operativo');
    expect(platformHealthLabel('degraded')).toBe('Degradado');
    expect(platformHealthLabel('unknown')).toBe('Sin datos');
    expect(platformHealthLabel('otro')).toBe('Sin datos');
  });

  it('explica el motivo del error', () => {
    expect(serviceErrorText(null)).toBeNull();
    expect(serviceErrorText('timeout')).toBe('Sin respuesta (timeout)');
    expect(serviceErrorText('connection_refused')).toBe('Conexión rechazada');
    expect(serviceErrorText('http_5xx')).toBe('Error del servidor (5xx)');
    expect(serviceErrorText('http_4xx')).toBe('Respuesta rechazada (4xx)');
    expect(serviceErrorText('invalid_response')).toBe('Respuesta inválida');
  });

  it('formatea la latencia', () => {
    expect(formatLatency(null)).toBe('—');
    expect(formatLatency(85.4)).toBe('85 ms');
    expect(formatLatency(1234)).toBe('1,2 s');
  });

  it('formatea "hace X"', () => {
    const now = Date.parse('2026-11-03T12:00:00Z');
    expect(formatTimeAgo(null, now)).toBe('—');
    expect(formatTimeAgo('no es fecha', now)).toBe('—');
    expect(formatTimeAgo('2026-11-03T11:59:55Z', now)).toBe('recién');
    expect(formatTimeAgo('2026-11-03T11:59:30Z', now)).toBe('hace 30 s');
    expect(formatTimeAgo('2026-11-03T11:55:00Z', now)).toBe('hace 5 min');
    expect(formatTimeAgo('2026-11-03T09:00:00Z', now)).toBe('hace 3 h');
    expect(formatTimeAgo('2026-11-02T12:00:00Z', now)).toBe('hace 1 día');
    expect(formatTimeAgo('2026-10-31T12:00:00Z', now)).toBe('hace 3 días');
  });

  it('distingue 401 y 403', () => {
    expect(isUnauthorized(new ApiError({ status: 401 }))).toBe(true);
    expect(isForbidden(new ApiError({ status: 403 }))).toBe(true);
    expect(isForbidden(new ApiError({ status: 500 }))).toBe(false);
    expect(isForbidden(new Error('x'))).toBe(false);
    expect(platformStatusErrorMessage(new ApiError({ status: 403 }))).toMatch(/no tiene permisos de staff/);
    expect(platformStatusErrorMessage(new ApiError({ status: 401 }))).toMatch(/sesión venció/);
  });
});

describe('usePlatformStatus', () => {
  const fetchMock = vi.fn();
  const onAuthFailure = vi.fn();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({
      baseUrl: 'http://api.test',
      getToken: async () => 'token-staff',
      onAuthFailure,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    onAuthFailure.mockReset();
  });

  it('pide /api/v1/admin/status con el token y devuelve los servicios', async () => {
    fetchMock.mockResolvedValue(jsonResponse(STATUS));
    const { result } = renderHook(() => usePlatformStatus(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.services.map((s) => s.id)).toEqual(['gateway', 'voice']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/v1/admin/status');
    expect(init.headers.Authorization).toBe('Bearer token-staff');
  });

  it('un 403 queda como isForbidden, sin reintentar', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ type: 'about:blank', title: 'Forbidden', status: 403, detail: 'staff only' }, 403, 'application/problem+json'),
    );
    const { result } = renderHook(() => usePlatformStatus(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(isForbidden(result.current.error)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('un 401 (tras renovar el token) queda como isUnauthorized, sin reintentar', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
    const { result } = renderHook(() => usePlatformStatus(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(isUnauthorized(result.current.error)).toBe(true);
    // El cliente renueva el token una vez (2 pedidos) y avisa; React Query no suma reintentos
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onAuthFailure).toHaveBeenCalled();
  });
});
