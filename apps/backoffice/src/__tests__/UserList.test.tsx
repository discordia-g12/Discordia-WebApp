import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient } from '@discordia/core';
import { UsersSection } from '../sections/UsersSection';

const account = (id: string, username: string | null, email: string, suspended = false) => ({
  user_id: id,
  username,
  display_name: username ? username.toUpperCase() : null,
  email,
  is_suspended: suspended,
  suspended_at: suspended ? '2026-11-03T12:00:00Z' : null,
  suspended_by: null,
  suspension_reason: suspended ? 'spam' : null,
  created_at: '2026-03-01T00:00:00Z',
});

const SOFI = account('auth0|1', 'sofi', 'sofi@mail.com');
const TOMAS = account('auth0|2', 'tomasv', 'tomas@mail.com', true);

function json(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

const page = (items: unknown[], total = items.length, pageNumber = 1) => ({ items, total, page: pageNumber, page_size: 25 });

/** Los pedidos del listado (GET /api/v1/admin/users?...), con sus parámetros. */
const listRequests = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls
    .map(([url, init]) => ({ url: new URL(String(url)), method: (init as RequestInit | undefined)?.method }))
    .filter((r) => r.url.pathname === '/api/v1/admin/users' && r.method === 'GET')
    .map((r) => Object.fromEntries(r.url.searchParams));

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <UsersSection />
    </QueryClientProvider>,
  );
}

describe('Ver listado de usuarios con filtros', () => {
  const fetchMock = vi.fn();
  let listResponse: (params: Record<string, string>) => Response;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'token', onAuthFailure: () => {} });
    listResponse = () => json(page([SOFI, TOMAS]));
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const parsed = new URL(url);
      if (parsed.pathname === '/api/v1/admin/users' && (init?.method ?? 'GET') === 'GET') {
        return listResponse(Object.fromEntries(parsed.searchParams));
      }
      if (parsed.pathname === '/api/v1/admin/users/suspended') return json([TOMAS]);
      if (init?.method === 'DELETE') return json({ ...TOMAS, is_suspended: false });
      return json({}, 404);
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  const table = () => screen.getByRole('table', { name: 'Usuarios de la plataforma' });

  it('muestra las cuentas con email, registro y estado', async () => {
    renderSection();

    expect(await within(await screen.findByRole('table')).findByText('sofi@mail.com')).toBeTruthy();
    const rows = within(table()).getAllByRole('row');
    expect(rows).toHaveLength(3); // encabezado + 2
    expect(within(rows[2]).getByText('suspendido')).toBeTruthy();
    expect(screen.getByText('2 cuentas · página 1 de 1')).toBeTruthy();
    expect(listRequests(fetchMock)[0]).toEqual({ state: 'all', page: '1', page_size: '25' });
  });

  it('busca por email o nombre en el servidor, sin pedir una vez por letra (CA 1)', async () => {
    renderSection();
    await screen.findByText('sofi@mail.com');
    listResponse = (params) => json(page(params.q === 'tom' ? [TOMAS] : [SOFI, TOMAS]));

    const search = screen.getByLabelText('buscar');
    fireEvent.change(search, { target: { value: 't' } });
    fireEvent.change(search, { target: { value: 'to' } });
    fireEvent.change(search, { target: { value: 'tom' } });

    await waitFor(() => expect(within(table()).queryByText('sofi@mail.com')).toBeNull());
    expect(within(table()).getByText('tomas@mail.com')).toBeTruthy();
    const queries = listRequests(fetchMock).map((p) => p.q);
    expect(queries).toEqual([undefined, 'tom']);
  });

  it('filtra por estado (CA 2)', async () => {
    renderSection();
    await screen.findByText('sofi@mail.com');
    listResponse = (params) => json(page(params.state === 'suspended' ? [TOMAS] : [SOFI, TOMAS]));

    fireEvent.click(screen.getByRole('radio', { name: 'suspendidos' }));

    await waitFor(() => expect(within(table()).queryByText('sofi@mail.com')).toBeNull());
    expect(listRequests(fetchMock).at(-1)).toMatchObject({ state: 'suspended' });
  });

  it('sin resultados dice que ninguno coincide', async () => {
    listResponse = () => json(page([]));
    renderSection();

    fireEvent.change(screen.getByLabelText('buscar'), { target: { value: 'nadie' } });

    expect(await screen.findByText('ningún usuario coincide')).toBeTruthy();
  });

  it('pagina, y una búsqueda nueva vuelve a la primera página', async () => {
    listResponse = (params) => json(page([SOFI], 30, Number(params.page)));
    renderSection();

    expect(await screen.findByText('30 cuentas · página 1 de 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '_siguiente' }));
    expect(await screen.findByText('30 cuentas · página 2 de 2')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('buscar'), { target: { value: 'sofi' } });
    await waitFor(() => expect(listRequests(fetchMock).at(-1)).toMatchObject({ q: 'sofi', page: '1' }));
  });

  it('si no es staff muestra el 403 y no ofrece reintentar', async () => {
    listResponse = () => json({ title: 'Forbidden', status: 403 }, 403, 'application/problem+json');
    renderSection();

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.map((a) => a.textContent)).toContain('Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.');
    expect(within(screen.getByRole('region', { name: 'Usuarios de la plataforma' })).queryByRole('button', { name: /^Reintentar/ })).toBeNull();
  });

  it('"_suspender" completa el formulario de suspensión con el email de la cuenta', async () => {
    renderSection();
    const row = (await within(await screen.findByRole('table')).findByText('sofi@mail.com')).closest('tr')!;

    fireEvent.click(within(row).getByRole('button', { name: '_suspender' }));

    const suspendCell = screen.getByRole('region', { name: 'Suspender usuario' });
    expect((within(suspendCell).getByLabelText(/^usuario/) as HTMLInputElement).value).toBe('sofi@mail.com');
  });

  it('"_reactivar" pide confirmación y reactiva la cuenta', async () => {
    renderSection();
    const row = (await within(await screen.findByRole('table')).findByText('tomas@mail.com')).closest('tr')!;

    fireEvent.click(within(row).getByRole('button', { name: '_reactivar' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Reactivar/ }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/auth0%7C2/suspension') && init?.method === 'DELETE')).toBe(true),
    );
  });
});
