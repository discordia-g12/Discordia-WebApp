import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient, type AdminIncident, type PlatformStatus } from '@discordia/core';
import { ActiveIncidentsCell, IncidentHistoryCell, PublishIncidentCell } from '../sections/IncidentCells';
import { StatusSection } from '../sections/StatusSection';
import { isFeatureReady } from '../features';

const INCIDENT: AdminIncident = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'degraded',
  status: 'active',
  title: 'Demoras en la voz',
  description: 'Los canales tardan en conectar.',
  affectedServices: ['voice'],
  startedAt: new Date().toISOString(),
  createdBy: 'auth0|staff',
  resolvedBy: null,
  resolvedAt: null,
  resolutionNote: null,
};

const STATUS: PlatformStatus = {
  status: 'degraded',
  checkedAt: new Date().toISOString(),
  services: [
    { id: 'chat', name: 'Chat', status: 'degraded', httpStatus: 503, latencyMs: 4, checkedAt: null, since: new Date().toISOString(), error: 'http_5xx' },
    { id: 'voice', name: 'Voz', status: 'degraded', httpStatus: null, latencyMs: null, checkedAt: null, since: null, error: 'timeout' },
  ],
};

const FORBIDDEN = { type: 'about:blank', title: 'Forbidden', status: 403, detail: 'Forbidden: staff only' };

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

describe('Incidentes en el backoffice', () => {
  const fetchMock = vi.fn();
  const route = (handler: Handler) =>
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init: RequestInit = {}) => handler(new URL(String(input)), init));
  const calls = () =>
    fetchMock.mock.calls.map(([url, init]) => ({
      url: String(url),
      method: (init as RequestInit)?.method ?? 'GET',
      body: (init as RequestInit)?.body ? JSON.parse(String((init as RequestInit).body)) : undefined,
    }));

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'token', onAuthFailure: () => {} });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('la función está habilitada', () => {
    expect(isFeatureReady('status.incidents')).toBe(true);
  });

  it('CA 1: publica con título, descripción, tipo y servicios después de confirmar', async () => {
    route(() => jsonResponse({ ...INCIDENT, kind: 'maintenance', affectedServices: ['chat', 'voice'] }, 201));
    renderWithClient(<PublishIncidentCell />);

    const publish = screen.getByRole('button', { name: /^Publicar/ });
    expect(publish).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByLabelText(/título/), { target: { value: 'Demoras en la voz' } });
    fireEvent.change(screen.getByLabelText(/descripción/), { target: { value: 'Los canales tardan en conectar.' } });
    fireEvent.click(screen.getByRole('radio', { name: 'mantenimiento' }));
    fireEvent.click(screen.getByLabelText('Voz'));
    fireEvent.click(screen.getByLabelText('Chat'));
    expect(publish).toHaveProperty('disabled', false);
    fireEvent.click(publish);

    // Nada se manda hasta confirmar
    const dialog = await screen.findByRole('alertdialog');
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: /^Publicar/ }));

    expect((await screen.findByRole('status')).textContent).toMatch(/Publicado: «Demoras en la voz»/);
    expect(calls()).toEqual([
      {
        url: 'http://api.test/api/v1/admin/incidents',
        method: 'POST',
        body: {
          title: 'Demoras en la voz',
          description: 'Los canales tardan en conectar.',
          kind: 'maintenance',
          affectedServices: ['voice', 'chat'],
        },
      },
    ]);
    // El formulario queda vacío
    expect((screen.getByLabelText(/título/) as HTMLInputElement).value).toBe('');
  });

  it('CA 4: si el servidor responde 403 lo dice, sin simular que se publicó', async () => {
    route(() => jsonResponse(FORBIDDEN, 403, 'application/problem+json'));
    renderWithClient(<PublishIncidentCell />);
    fireEvent.change(screen.getByLabelText(/título/), { target: { value: 'Caída' } });
    fireEvent.change(screen.getByLabelText(/descripción/), { target: { value: 'x' } });
    fireEvent.click(screen.getByLabelText('Chat'));
    fireEvent.click(screen.getByRole('button', { name: /^Publicar/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Publicar/ }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.',
    );
    expect(screen.queryByText(/Publicado:/)).toBeNull();
  });

  it('un título de menos de 3 caracteres no se puede publicar', () => {
    renderWithClient(<PublishIncidentCell />);
    fireEvent.change(screen.getByLabelText(/título/), { target: { value: '  ab ' } });
    fireEvent.change(screen.getByLabelText(/descripción/), { target: { value: 'x' } });
    fireEvent.click(screen.getByLabelText('Chat'));
    expect(screen.getByRole('button', { name: /^Publicar/ })).toHaveProperty('disabled', true);
  });

  it('CA 2: lista los activos y "_resolver" confirma y manda la nota', async () => {
    let resolved = false;
    route((url, init) => {
      if (init.method === 'POST') {
        resolved = true;
        return jsonResponse({ ...INCIDENT, status: 'resolved', resolutionNote: 'reiniciado' });
      }
      expect(url.searchParams.get('status')).toBe('active');
      return jsonResponse({ items: resolved ? [] : [INCIDENT], nextBefore: null });
    });
    renderWithClient(<ActiveIncidentsCell />);

    const list = await screen.findByRole('list', { name: 'Incidentes activos' });
    expect(within(list).getByText('Demoras en la voz')).toBeTruthy();
    expect(within(list).getByText(/Voz · desde/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/nota de cierre/), { target: { value: 'reiniciado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Resolver «Demoras en la voz»' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Resolver/ }));

    expect((await screen.findByRole('status')).textContent).toMatch(/Resuelto: «Demoras en la voz»/);
    await screen.findByText('no hay incidentes activos');
    const post = calls().find((c) => c.method === 'POST');
    expect(post).toEqual({
      url: `http://api.test/api/v1/admin/incidents/${INCIDENT.id}/resolve`,
      method: 'POST',
      body: { note: 'reiniciado' },
    });
  });

  it('resolver uno que ya estaba resuelto muestra el 409', async () => {
    route((_url, init) =>
      init.method === 'POST'
        ? jsonResponse({ ...FORBIDDEN, status: 409, title: 'Conflict' }, 409, 'application/problem+json')
        : jsonResponse({ items: [INCIDENT], nextBefore: null }),
    );
    renderWithClient(<ActiveIncidentsCell />);
    fireEvent.click(await screen.findByRole('button', { name: 'Resolver «Demoras en la voz»' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Resolver/ }));
    expect((await screen.findByRole('alert')).textContent).toBe('Ese incidente ya estaba resuelto.');
  });

  it('CA 4: el listado con 403 no ofrece reintentar ni resolver', async () => {
    route(() => jsonResponse(FORBIDDEN, 403, 'application/problem+json'));
    renderWithClient(<ActiveIncidentsCell />);
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.',
    );
    expect(screen.queryByText('reintentar')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('historial: muestra los resueltos con su nota', async () => {
    route(() =>
      jsonResponse({
        items: [{ ...INCIDENT, status: 'resolved', resolvedAt: new Date().toISOString(), resolutionNote: 'se reinició' }],
        nextBefore: null,
      }),
    );
    renderWithClient(<IncidentHistoryCell />);
    const list = await screen.findByRole('list', { name: 'Incidentes resueltos' });
    expect(within(list).getByText('/ se reinició')).toBeTruthy();
    expect(within(list).getByText(/resuelto recién/)).toBeTruthy();
  });

  it('plus: un servicio degradado sin incidente se sugiere y completa el formulario', async () => {
    route((url) => {
      if (url.pathname === '/api/v1/admin/status') return jsonResponse(STATUS);
      if (url.searchParams.get('status') === 'active') return jsonResponse({ items: [INCIDENT], nextBefore: null });
      return jsonResponse({ items: [], nextBefore: null });
    });
    renderWithClient(<StatusSection />);

    // Voz ya tiene un incidente activo: solo se sugiere Chat
    const suggestions = await screen.findByRole('list', { name: 'Incidentes sugeridos' });
    expect(within(suggestions).getAllByRole('listitem')).toHaveLength(1);
    expect(within(suggestions).getByText('Chat está degradado')).toBeTruthy();

    fireEvent.click(within(suggestions).getByRole('button', { name: /publicar incidente/ }));
    await waitFor(() =>
      expect((screen.getByLabelText(/título/) as HTMLInputElement).value).toBe('Problemas en Chat'),
    );
    expect((screen.getByLabelText('Chat') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Voz') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByRole('radio', { name: 'degradación' }).getAttribute('aria-checked')).toBe('true');

    fireEvent.click(within(suggestions).getByRole('button', { name: /descartar/ }));
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Incidentes sugeridos' })).toBeNull());
  });
});
