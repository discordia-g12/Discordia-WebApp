import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient, type PlatformMetrics } from '@discordia/core';
import { MetricsSection } from '../sections/MetricsSection';

const METRICS: PlatformMetrics = {
  from: '2026-10-12T12:00:00.000Z',
  to: '2026-11-11T12:00:00.000Z',
  activeUsers: 120,
  serversCreated: 8,
  messagesSent: 15432,
  partial: false,
};

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

function renderSection() {
  // El hook define sus reintentos (no ante 401/403); acá solo se les saca la espera
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MetricsSection />
    </QueryClientProvider>,
  );
}

/** Cifra de una tarjeta, por su etiqueta. */
function stat(label: string): string | null {
  const card = screen.getByText(label).parentElement as HTMLElement;
  return within(card).getAllByRole('definition')[0].textContent;
}

const requestedUrl = (call: number) => new URL(fetchMock.mock.calls[call][0]);

const fetchMock = vi.fn();

describe('MetricsSection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'token', onAuthFailure: () => {} });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('muestra la carga y después las tres cifras de los últimos 30 días', async () => {
    let resolve: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    renderSection();

    expect(screen.getByRole('status', { name: 'Consultando las métricas de la plataforma' })).toBeTruthy();
    expect(screen.queryByText('próximamente')).toBeNull();
    expect(screen.getByRole('radio', { name: '30 días' }).getAttribute('aria-checked')).toBe('true');

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const url = requestedUrl(0);
    expect(url.pathname).toBe('/api/v1/admin/metrics');
    const days = (Date.parse(url.searchParams.get('to')!) - Date.parse(url.searchParams.get('from')!)) / 86_400_000;
    expect(days).toBe(30);

    resolve(jsonResponse(METRICS));
    await screen.findByText('120');
    expect(stat('usuarios activos')).toBe('120');
    expect(stat('servidores creados')).toBe('8');
    expect(stat('mensajes enviados')).toBe('15.432');
    expect(screen.getByText('/ enviaron al menos un mensaje')).toBeTruthy();
    expect(screen.queryByText(/no respondió/)).toBeNull();
  });

  it('cambiar a 7 días vuelve a pedir con ese período', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(METRICS));
    renderSection();
    await screen.findByText('120');

    fireEvent.click(screen.getByRole('radio', { name: '7 días' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const url = requestedUrl(1);
    const days = (Date.parse(url.searchParams.get('to')!) - Date.parse(url.searchParams.get('from')!)) / 86_400_000;
    expect(days).toBe(7);
  });

  it('un resultado parcial avisa y muestra "sin datos" en lo que falta', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ ...METRICS, activeUsers: null, messagesSent: null, partial: true }));
    renderSection();

    expect((await screen.findByText(/Algún servicio no respondió/)).getAttribute('role')).toBe('status');
    expect(stat('usuarios activos')).toBe('sin datos');
    expect(stat('servidores creados')).toBe('8');
    expect(stat('mensajes enviados')).toBe('sin datos');
  });

  it('un 403 muestra que la cuenta no es staff, sin reintentar', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ type: 'about:blank', title: 'Forbidden', status: 403, detail: 'staff only' }, 403, 'application/problem+json'),
    );
    renderSection();

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.',
    );
    expect(screen.queryByRole('button', { name: '_reintentar' })).toBeNull();
    expect(screen.queryByText('usuarios activos')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('un error de red ofrece reintentar', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderSection();

    expect((await screen.findByRole('alert')).textContent).toMatch(/No pudimos consultar las métricas/);
    expect(fetchMock).toHaveBeenCalledTimes(3); // el pedido y dos reintentos
    fetchMock.mockImplementation(async () => jsonResponse(METRICS));
    fireEvent.click(screen.getByRole('button', { name: '_reintentar' }));
    expect(await screen.findByText('120')).toBeTruthy();
  });

  it('el rango personalizado se valida antes de pedir', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(METRICS));
    renderSection();
    await screen.findByText('120');

    fireEvent.click(screen.getByRole('radio', { name: 'personalizado' }));
    const form = screen.getByRole('form', { name: 'Período personalizado' });
    const from = within(form).getByLabelText('desde');
    const to = within(form).getByLabelText('hasta');

    fireEvent.change(from, { target: { value: '2026-11-10' } });
    fireEvent.change(to, { target: { value: '2026-11-01' } });
    fireEvent.click(within(form).getByRole('button', { name: /Consultar/ }));
    expect(screen.getByText(/anterior a "hasta"/)).toBeTruthy();

    fireEvent.change(from, { target: { value: '2025-01-01' } });
    fireEvent.change(to, { target: { value: '2026-11-01' } });
    fireEvent.click(within(form).getByRole('button', { name: /Consultar/ }));
    expect(screen.getByText(/no puede superar los 366 días/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(from, { target: { value: '2026-11-01' } });
    fireEvent.change(to, { target: { value: '2026-11-10' } });
    fireEvent.click(within(form).getByRole('button', { name: /Consultar/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(requestedUrl(1).searchParams.get('from')).toBe(new Date(2026, 10, 1).toISOString());
    expect(requestedUrl(1).searchParams.get('to')).toBe(new Date(2026, 10, 11).toISOString());
    expect(screen.queryByText(/anterior a "hasta"/)).toBeNull();
  });
});
