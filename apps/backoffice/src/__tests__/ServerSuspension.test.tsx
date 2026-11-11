import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient } from '@discordia/core';
import { SuspendServerCell } from '../sections/SuspendServerCell';
import { SuspendedServersCell } from '../sections/SuspendedServersCell';

const SERVER_ID = '3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b';

const SERVER = {
  id: SERVER_ID,
  name: 'Los Pibes',
  owner_id: 'auth0|owner',
  icon_url: null,
  member_count: 12,
  created_at: '2026-03-01T00:00:00Z',
  is_suspended: true,
  suspended_at: '2026-11-10T12:00:00Z',
  suspended_by: 'auth0|staff',
  suspension_reason: 'denuncia por estafas',
};

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const requests = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), method: (init as RequestInit)?.method, body: (init as RequestInit)?.body }));

describe('Suspender servidor', () => {
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

  // "^": la celda también tiene etiqueta ("Suspender servidor") y /servidor/ la encontraría a ella también
  const fill = (serverId: string, reason: string) => {
    fireEvent.change(screen.getByLabelText(/^id del servidor/i), { target: { value: serverId } });
    fireEvent.change(screen.getByLabelText(/^motivo/i), { target: { value: reason } });
  };

  it('no deja suspender sin un id válido y un motivo', () => {
    renderWithClient(<SuspendServerCell />);
    const button = screen.getByRole('button', { name: /^Suspender/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fill('Los Pibes', 'estafas');
    expect(button.disabled).toBe(true);
    expect(screen.getByText(/el id es un UUID/)).toBeTruthy();

    fill(SERVER_ID, '');
    expect(button.disabled).toBe(true);
  });

  it('pide confirmación y recién ahí suspende por id (CA 1)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(SERVER, 201));
    renderWithClient(<SuspendServerCell />);

    fill(SERVER_ID, 'denuncia por estafas');
    fireEvent.click(screen.getByRole('button', { name: /^Suspender/ }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/Ningún miembro del servidor 3f2a9c1e/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /^Suspender/ }));

    expect(await screen.findByText('Los Pibes quedó suspendido.')).toBeTruthy();
    const [request] = requests(fetchMock);
    expect(request.url).toBe(`http://api.test/api/v1/admin/servers/${SERVER_ID}/suspension`);
    expect(request.method).toBe('POST');
    expect(JSON.parse(String(request.body))).toEqual({ reason: 'denuncia por estafas' });
  });

  it('cancelar la confirmación no suspende', async () => {
    renderWithClient(<SuspendServerCell />);
    fill(SERVER_ID, 'estafas');
    fireEvent.click(screen.getByRole('button', { name: /^Suspender/ }));

    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /cancelar/i }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'No existe un servidor con ese id.'],
    [409, 'Ese servidor ya está suspendido.'],
    [403, 'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.'],
  ])('muestra qué pasó si el servidor responde %i', async (status, message) => {
    fetchMock.mockResolvedValue(jsonResponse({ title: 'x', status, detail: 'x' }, status, 'application/problem+json'));
    renderWithClient(<SuspendServerCell />);
    fill(SERVER_ID, 'estafas');
    fireEvent.click(screen.getByRole('button', { name: /^Suspender/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Suspender/ }));

    expect((await screen.findByRole('alert')).textContent).toBe(message);
  });
});

describe('Servidores suspendidos', () => {
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

  it('muestra que no hay servidores suspendidos', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    renderWithClient(<SuspendedServersCell />);

    expect(await screen.findByText('no hay servidores suspendidos')).toBeTruthy();
  });

  it('lista los suspendidos con id, miembros y motivo, y levanta la suspensión con confirmación (CA 2)', async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? jsonResponse({ ...SERVER, is_suspended: false }) : jsonResponse([SERVER]),
    );
    renderWithClient(<SuspendedServersCell />);

    expect(await screen.findByText('Los Pibes')).toBeTruthy();
    expect(screen.getByText(/12 miembros · .*denuncia por estafas/)).toBeTruthy();
    expect(screen.getByText(new RegExp(SERVER_ID))).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Levantar la suspensión de Los Pibes' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Levantar/ }));

    expect(await screen.findByText('Los Pibes volvió a estar activo.')).toBeTruthy();
    const deleteCall = requests(fetchMock).find((r) => r.method === 'DELETE');
    expect(deleteCall?.url).toBe(`http://api.test/api/v1/admin/servers/${SERVER_ID}/suspension`);
  });

  it('si no es staff muestra el 403 y no ofrece reintentar', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ title: 'Forbidden', status: 403 }, 403, 'application/problem+json'));
    renderWithClient(<SuspendedServersCell />);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.',
    );
    expect(screen.queryByRole('button', { name: /^Reintentar/ })).toBeNull();
  });
});
