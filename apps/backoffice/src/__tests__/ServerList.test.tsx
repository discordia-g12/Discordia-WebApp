import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient } from '@discordia/core';
import { ServersSection } from '../sections/ServersSection';

const server = (id: string, name: string, members: number, suspended = false) => ({
  id,
  name,
  owner_id: 'auth0|owner',
  icon_url: null,
  member_count: members,
  created_at: '2026-03-01T00:00:00Z',
  is_suspended: suspended,
  suspended_at: suspended ? '2026-11-10T12:00:00Z' : null,
  suspended_by: suspended ? 'auth0|staff' : null,
  suspension_reason: suspended ? 'estafas' : null,
});

// Dos servidores con el mismo nombre: solo el id los distingue
const PIBES_A = server('11111111-1111-4111-8111-111111111111', 'Los Pibes', 12);
const PIBES_B = server('22222222-2222-4222-8222-222222222222', 'Los Pibes', 3);
const CASTIGADO = server('33333333-3333-4333-8333-333333333333', 'Castigado', 5, true);

function json(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

const page = (items: unknown[], total = items.length, pageNumber = 1) => ({ items, total, page: pageNumber, page_size: 25 });

/** Los pedidos del listado (GET /api/v1/admin/servers?...), con sus parámetros. */
const listRequests = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls
    .map(([url, init]) => ({ url: new URL(String(url)), method: (init as RequestInit | undefined)?.method ?? 'GET' }))
    .filter((r) => r.url.pathname === '/api/v1/admin/servers' && r.method === 'GET')
    .map((r) => Object.fromEntries(r.url.searchParams));

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <ServersSection />
    </QueryClientProvider>,
  );
}

describe('Ver listado de servidores de la plataforma', () => {
  const fetchMock = vi.fn();
  let listResponse: (params: Record<string, string>) => Response;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'token', onAuthFailure: () => {} });
    listResponse = () => json(page([PIBES_A, PIBES_B, CASTIGADO]));
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const parsed = new URL(url);
      const method = init?.method ?? 'GET';
      if (parsed.pathname === '/api/v1/admin/servers' && method === 'GET') {
        return listResponse(Object.fromEntries(parsed.searchParams));
      }
      if (parsed.pathname === '/api/v1/admin/servers/suspended') return json([CASTIGADO]);
      if (parsed.pathname.endsWith('/suspension') && method === 'DELETE') {
        return json({ ...CASTIGADO, is_suspended: false });
      }
      if (method === 'DELETE') {
        return json({
          id: PIBES_A.id,
          name: PIBES_A.name,
          owner_id: PIBES_A.owner_id,
          member_count: PIBES_A.member_count,
          deleted_by: 'auth0|staff',
          reason: 'incumplimiento',
          deleted_at: '2026-11-12T12:00:00Z',
        });
      }
      return json({}, 404);
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  const table = () => screen.getByRole('table', { name: 'Servidores de la plataforma' });
  const rowOf = (text: string) => within(table()).getByText(text).closest('tr')!;

  it('muestra cada servidor con su id, miembros, creación y estado', async () => {
    renderSection();

    expect(await screen.findByText(PIBES_A.id)).toBeTruthy();
    const rows = within(table()).getAllByRole('row');
    expect(rows).toHaveLength(4); // encabezado + 3
    // Mismo nombre, distinto id y cantidad de miembros
    expect(within(rowOf(PIBES_A.id)).getByText('12')).toBeTruthy();
    expect(within(rowOf(PIBES_B.id)).getByText('3')).toBeTruthy();
    expect(within(rowOf(CASTIGADO.id)).getByText('suspendido')).toBeTruthy();
    expect(screen.getByText('3 servidores · página 1 de 1')).toBeTruthy();
    expect(listRequests(fetchMock)[0]).toEqual({ state: 'all', page: '1', page_size: '25' });
  });

  it('busca por nombre en el servidor, sin pedir una vez por letra', async () => {
    renderSection();
    await screen.findByText(PIBES_A.id);
    listResponse = (params) => json(page(params.q === 'cas' ? [CASTIGADO] : [PIBES_A, PIBES_B, CASTIGADO]));

    const search = screen.getByLabelText('buscar');
    fireEvent.change(search, { target: { value: 'c' } });
    fireEvent.change(search, { target: { value: 'ca' } });
    fireEvent.change(search, { target: { value: 'cas' } });

    await waitFor(() => expect(within(table()).queryByText(PIBES_A.id)).toBeNull());
    expect(listRequests(fetchMock).map((p) => p.q)).toEqual([undefined, 'cas']);
  });

  it('filtra por estado', async () => {
    renderSection();
    await screen.findByText(PIBES_A.id);
    listResponse = (params) => json(page(params.state === 'suspended' ? [CASTIGADO] : [PIBES_A, PIBES_B, CASTIGADO]));

    fireEvent.click(screen.getByRole('radio', { name: 'suspendidos' }));

    await waitFor(() => expect(within(table()).queryByText(PIBES_A.id)).toBeNull());
    expect(listRequests(fetchMock).at(-1)).toMatchObject({ state: 'suspended' });
  });

  it('sin resultados dice que ninguno coincide', async () => {
    listResponse = () => json(page([]));
    renderSection();

    fireEvent.change(screen.getByLabelText('buscar'), { target: { value: 'nadie' } });

    expect(await screen.findByText('ningún servidor coincide')).toBeTruthy();
  });

  it('si no es staff muestra el 403 y no ofrece reintentar', async () => {
    listResponse = () => json({ title: 'Forbidden', status: 403 }, 403, 'application/problem+json');
    renderSection();

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.map((a) => a.textContent)).toContain('Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.');
    expect(within(screen.getByRole('region', { name: 'Servidores de la plataforma' })).queryByRole('button', { name: /^Reintentar/ })).toBeNull();
  });

  it('"_suspender" completa el formulario con el id del servidor elegido, no con el nombre', async () => {
    renderSection();
    await screen.findByText(PIBES_B.id);

    fireEvent.click(within(rowOf(PIBES_B.id)).getByRole('button', { name: 'Suspender Los Pibes' }));

    const suspendCell = screen.getByRole('region', { name: 'Suspender servidor' });
    expect((within(suspendCell).getByLabelText(/^id del servidor/) as HTMLInputElement).value).toBe(PIBES_B.id);
    expect(within(suspendCell).getByText(/servidor: Los Pibes/)).toBeTruthy();

    // La confirmación nombra al servidor y su id
    fireEvent.change(within(suspendCell).getByLabelText(/^motivo/), { target: { value: 'estafas' } });
    fireEvent.click(within(suspendCell).getByRole('button', { name: /^Suspender/ }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(new RegExp(`Los Pibes \\(${PIBES_B.id}\\)`))).toBeTruthy();
  });

  it('"_levantar suspensión" pide confirmación y la levanta', async () => {
    renderSection();
    await screen.findByText(CASTIGADO.id);

    fireEvent.click(within(rowOf(CASTIGADO.id)).getByRole('button', { name: 'Levantar la suspensión de Castigado' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Levantar/ }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url, init]) => String(url).endsWith(`/${CASTIGADO.id}/suspension`) && init?.method === 'DELETE'),
      ).toBe(true),
    );
  });

  it('"_eliminar" precarga el id en el formulario de eliminación y pide confirmación antes de borrar', async () => {
    renderSection();
    await screen.findByText(PIBES_A.id);

    fireEvent.click(within(rowOf(PIBES_A.id)).getByRole('button', { name: 'Eliminar Los Pibes' }));

    const deleteCell = screen.getByRole('region', { name: 'Eliminar servidor' });
    const idInput = within(deleteCell).getByLabelText(/^id del servidor/i) as HTMLInputElement;
    expect(idInput.value).toBe(PIBES_A.id);

    fireEvent.change(within(deleteCell).getByLabelText(/^motivo/i), { target: { value: 'incumplimiento' } });
    fireEvent.click(within(deleteCell).getByRole('button', { name: /^Eliminar servidor/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Eliminar servidor/ }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url, init]) => String(url).endsWith(`/api/v1/admin/servers/${PIBES_A.id}`) && init?.method === 'DELETE'),
      ).toBe(true),
    );
  });
});
