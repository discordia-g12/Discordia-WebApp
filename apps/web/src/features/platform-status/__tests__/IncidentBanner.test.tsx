import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient, PUBLIC_STATUS_REFETCH_MS, type PublicIncident, type PublicPlatformStatus } from '@discordia/core';
import { IncidentBanner } from '../IncidentBanner';
import { PlatformStatusModal } from '../PlatformStatusModal';
import { useUIStore } from '../../../app/uiStore';

const INCIDENT: PublicIncident = {
  id: 'i1',
  kind: 'degraded',
  title: 'Demoras en la voz',
  description: 'Los canales tardan en conectar.',
  affectedServices: ['voice', 'chat'],
  startedAt: new Date().toISOString(),
};

function status(incidents: PublicIncident[], overall: PublicPlatformStatus['status'] = 'operational'): PublicPlatformStatus {
  return {
    status: overall,
    checkedAt: new Date().toISOString(),
    services: [
      { id: 'chat', name: 'Chat', status: incidents.length ? 'degraded' : 'operational' },
      { id: 'voice', name: 'Voz', status: incidents.length ? 'degraded' : 'operational' },
    ],
    incidents,
  };
}

function jsonResponse(body: unknown, statusCode = 200) {
  return new Response(JSON.stringify(body), { status: statusCode, headers: { 'content-type': 'application/json' } });
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('Aviso de incidentes (historia 74)', () => {
  const fetchMock = vi.fn();
  let current: PublicPlatformStatus;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    current = status([]);
    fetchMock.mockImplementation(async () => jsonResponse(current));
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'token', onAuthFailure: () => {} });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    useUIStore.getState().setActiveModal(null);
  });

  it('pide el estado público sin token', async () => {
    renderWithClient(<IncidentBanner />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://api.test/api/v1/status');
    expect(new Headers((init as RequestInit).headers).get('authorization')).toBeNull();
  });

  it('CA 1 y CA 2: aparece con un incidente activo y desaparece solo al resolverse', async () => {
    current = status([INCIDENT], 'degraded');
    renderWithClient(<IncidentBanner />);

    const region = screen.getByRole('status');
    expect(await within(region).findByText('Degradación /')).toBeTruthy();
    expect(within(region).getByText('Demoras en la voz · Voz, Chat')).toBeTruthy();

    // El staff lo resuelve: en el próximo refresco (60 s) el aviso se va, sin recargar
    current = status([]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PUBLIC_STATUS_REFETCH_MS);
    });
    await vi.waitFor(() => expect(within(region).queryByText('Degradación /')).toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('un incidente publicado mientras se usa la app aparece en el próximo refresco', async () => {
    renderWithClient(<IncidentBanner />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Demoras/)).toBeNull();

    current = status([{ ...INCIDENT, kind: 'maintenance', affectedServices: ['payments'] }], 'maintenance');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PUBLIC_STATUS_REFETCH_MS);
    });
    expect(await screen.findByText('Mantenimiento /')).toBeTruthy();
    expect(screen.getByText('Demoras en la voz · Pagos')).toBeTruthy();
  });

  it('con varios incidentes muestra cuántos y deja lugar arriba (data-incident-banner)', async () => {
    current = status([INCIDENT, { ...INCIDENT, id: 'i2', title: 'Pagos lentos', kind: 'maintenance' }], 'degraded');
    renderWithClient(<IncidentBanner />);
    expect(await screen.findByText('2 incidentes activos')).toBeTruthy();
    expect(screen.getByText('Degradación /')).toBeTruthy();
    expect(document.querySelector('[data-incident-banner]')).not.toBeNull();

    current = status([{ ...INCIDENT, kind: 'maintenance' }, { ...INCIDENT, id: 'i2', kind: 'maintenance' }], 'maintenance');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(PUBLIC_STATUS_REFETCH_MS);
    });
    expect(await screen.findByText('Mantenimiento /')).toBeTruthy();
  });

  it('"_ver estado" abre la vista de estado', async () => {
    current = status([INCIDENT], 'degraded');
    renderWithClient(<IncidentBanner />);
    fireEvent.click(await screen.findByRole('button', { name: '_ver estado' }));
    expect(useUIStore.getState().activeModal).toBe('platform-status');
  });

  it('si el estado no responde no muestra ningún aviso', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ title: 'boom' }, 503));
    renderWithClient(<IncidentBanner />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByRole('status').textContent).toBe('');
  });
});

describe('Vista de estado (CA 3)', () => {
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

  it('muestra el estado global, los incidentes activos y cada servicio', async () => {
    fetchMock.mockResolvedValue(jsonResponse(status([INCIDENT], 'degraded')));
    renderWithClient(<PlatformStatusModal onClose={() => {}} />);

    expect(await screen.findByText('Demoras en la voz')).toBeTruthy();
    expect(screen.getByText('Los canales tardan en conectar.')).toBeTruthy();
    expect(screen.getByText(/Voz, Chat · desde/)).toBeTruthy();
    const services = screen.getByRole('region', { name: 'Servicios' });
    expect(within(services).getAllByText('Degradado')).toHaveLength(2);
    expect(screen.getByText(/^Plataforma/).textContent).toBe('Plataforma / Degradado');
  });

  it('en mantenimiento y sin incidentes lo dice', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...status([]), status: 'maintenance' }));
    renderWithClient(<PlatformStatusModal onClose={() => {}} />);
    expect((await screen.findByText(/^Plataforma/)).textContent).toBe('Plataforma / En mantenimiento');
    expect(screen.getByText('no hay incidentes activos')).toBeTruthy();
  });

  it('con error ofrece reintentar', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchMock.mockResolvedValue(jsonResponse(status([])));
    renderWithClient(<PlatformStatusModal onClose={() => {}} />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/No pudimos consultar el estado/);
    fireEvent.click(screen.getByRole('button', { name: '_reintentar' }));
    expect((await screen.findByText(/^Plataforma/)).textContent).toBe('Plataforma / Operativo');
  });
});
