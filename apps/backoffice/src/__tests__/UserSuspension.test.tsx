import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient } from '@discordia/core';
import { ReactivateAccountCell } from '../sections/ReactivateAccountCell';
import { SuspendAccountCell } from '../sections/SuspendAccountCell';

const ACCOUNT = {
  user_id: 'auth0|u1',
  username: 'tomasv',
  display_name: 'Tomás',
  email: 'tomas@mail.com',
  is_suspended: true,
  suspended_at: '2026-11-03T12:00:00Z',
  suspended_by: 'auth0|staff',
  suspension_reason: 'spam reiterado',
  created_at: '2026-03-01T00:00:00Z',
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

describe('Suspender usuario', () => {
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

  // "^": la celda también tiene etiqueta ("Suspender usuario") y /usuario/ la encontraría a ella también
  const fill = (user: string, reason: string) => {
    fireEvent.change(screen.getByLabelText(/^usuario/i), { target: { value: user } });
    fireEvent.change(screen.getByLabelText(/^motivo/i), { target: { value: reason } });
  };

  it('no deja suspender sin usuario y motivo', () => {
    renderWithClient(<SuspendAccountCell />);
    const button = screen.getByRole('button', { name: /^Suspender/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fill('@tomasv', '');
    expect(button.disabled).toBe(true);
  });

  it('pide confirmación y recién ahí suspende (CA 1)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(ACCOUNT, 201));
    renderWithClient(<SuspendAccountCell />);

    fill('@tomasv', 'spam reiterado');
    fireEvent.click(screen.getByRole('button', { name: /^Suspender/ }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/@tomasv no va a poder iniciar sesión/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /^Suspender/ }));

    expect(await screen.findByText('Tomás (@tomasv) quedó suspendida.')).toBeTruthy();
    const [request] = requests(fetchMock);
    expect(request.url).toBe('http://api.test/api/v1/admin/users/suspensions');
    expect(request.method).toBe('POST');
    expect(JSON.parse(String(request.body))).toEqual({ user: '@tomasv', reason: 'spam reiterado' });
  });

  it('cancelar la confirmación no suspende', async () => {
    renderWithClient(<SuspendAccountCell />);
    fill('@tomasv', 'spam');
    fireEvent.click(screen.getByRole('button', { name: /^Suspender/ }));

    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /cancelar/i }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'No hay ninguna cuenta con ese email, @usuario o id.'],
    [409, 'Esa cuenta ya está suspendida.'],
    [400, 'No podés suspender tu propia cuenta.'],
    [403, 'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.'],
    [503, 'No se pudo aplicar ahora: Auth0 o la lista de suspendidos no respondieron. No quedó nada a medias, probá de nuevo.'],
  ])('muestra qué pasó si el servidor responde %i', async (status, message) => {
    fetchMock.mockResolvedValue(jsonResponse({ title: 'x', status, detail: 'x' }, status, 'application/problem+json'));
    renderWithClient(<SuspendAccountCell />);
    fill('@tomasv', 'spam');
    fireEvent.click(screen.getByRole('button', { name: /^Suspender/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Suspender/ }));

    expect((await screen.findByRole('alert')).textContent).toBe(message);
  });
});

describe('Reactivar usuario', () => {
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

  it('muestra que no hay cuentas suspendidas', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    renderWithClient(<ReactivateAccountCell />);

    expect(await screen.findByText('no hay cuentas suspendidas')).toBeTruthy();
  });

  it('lista las suspendidas con fecha y motivo, y reactiva con confirmación', async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? jsonResponse({ ...ACCOUNT, is_suspended: false }) : jsonResponse([ACCOUNT]),
    );
    renderWithClient(<ReactivateAccountCell />);

    expect(await screen.findByText('Tomás (@tomasv)')).toBeTruthy();
    expect(screen.getByText(/spam reiterado/)).toBeTruthy();

    // ActionLink muestra "_reactivar"
    fireEvent.click(screen.getByRole('button', { name: '_reactivar' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^Reactivar/ }));

    expect(await screen.findByText('Tomás (@tomasv) volvió a estar activa.')).toBeTruthy();
    const deleteCall = requests(fetchMock).find((r) => r.method === 'DELETE');
    expect(deleteCall?.url).toBe('http://api.test/api/v1/admin/users/auth0%7Cu1/suspension');
  });

  it('si no es staff muestra el 403 y no ofrece reintentar (CA 3)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ title: 'Forbidden', status: 403 }, 403, 'application/problem+json'));
    renderWithClient(<ReactivateAccountCell />);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.',
    );
    expect(screen.queryByRole('button', { name: /^Reintentar/ })).toBeNull();
  });

  it('si falla la red ofrece reintentar', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderWithClient(<ReactivateAccountCell />);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No pudimos conectar con el servidor. Revisá tu conexión y probá de nuevo.',
    );
    expect(screen.getByRole('button', { name: /^Reintentar/ })).toBeTruthy();
  });
});
