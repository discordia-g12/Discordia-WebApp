import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient, type PlatformStatus } from '@discordia/core';
import { PlatformStatusPanel } from '../sections/PlatformStatusPanel';

const STATUS: PlatformStatus = {
  status: 'degraded',
  checkedAt: new Date().toISOString(),
  services: [
    { id: 'gateway', name: 'API Gateway', status: 'operational', httpStatus: 200, latencyMs: 12, checkedAt: null, since: null, error: null },
    { id: 'voice', name: 'Voz', status: 'degraded', httpStatus: null, latencyMs: null, checkedAt: null, since: null, error: 'timeout' },
  ],
};

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

function renderPanel(grafanaUrl?: string) {
  // El hook define sus reintentos (no ante 401/403); acá solo se les saca la espera
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <PlatformStatusPanel grafanaUrl={grafanaUrl} />
    </QueryClientProvider>,
  );
}

describe('PlatformStatusPanel', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'token', onAuthFailure: () => {} });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('muestra el estado global y cada servicio con texto y motivo', async () => {
    fetchMock.mockResolvedValue(jsonResponse(STATUS));
    renderPanel();

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3); // encabezado + 2 servicios
    expect(within(rows[1]).getByText('API Gateway')).toBeTruthy();
    expect(within(rows[1]).getByText('Operativo')).toBeTruthy();
    expect(within(rows[1]).getByText('12 ms')).toBeTruthy();
    expect(within(rows[2]).getByText('Degradado')).toBeTruthy();
    expect(within(rows[2]).getByText('Sin respuesta (timeout)')).toBeTruthy();
    expect(within(screen.getAllByRole('status')[0]).getByText('Degradado')).toBeTruthy();
    expect(screen.getByText(/actualizado recién/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Actualizar/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('un 403 muestra que la cuenta no es staff, sin botón de actualizar', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ type: 'about:blank', title: 'Forbidden', status: 403, detail: 'staff only' }, 403, 'application/problem+json'),
    );
    renderPanel();

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.',
    );
    expect(screen.queryByRole('button', { name: /^Actualizar/ })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('un error de red ofrece reintentar', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPanel();

    expect((await screen.findByRole('alert')).textContent).toMatch(/No pudimos consultar el estado/);
    expect(fetchMock).toHaveBeenCalledTimes(3); // el pedido y dos reintentos
    fetchMock.mockResolvedValue(jsonResponse(STATUS));
    fireEvent.click(screen.getByRole('button', { name: '_reintentar' }));
    expect(await screen.findByRole('table')).toBeTruthy();
  });

  it('el link a Grafana aparece solo con URL', async () => {
    fetchMock.mockResolvedValue(jsonResponse(STATUS));
    const { unmount } = renderPanel();
    await screen.findByRole('table');
    expect(screen.queryByRole('link', { name: /Abrir Grafana/ })).toBeNull();
    unmount();

    renderPanel('http://localhost:3030');
    const link = await screen.findByRole('link', { name: /Abrir Grafana/ });
    expect(link.getAttribute('href')).toBe('http://localhost:3030');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText(/Requiere el túnel SSM al nodo infra/)).toBeTruthy();
  });
});
