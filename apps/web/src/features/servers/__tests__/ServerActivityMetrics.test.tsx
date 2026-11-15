import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { configureClient, useSession } from '@discordia/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerActivityMetrics } from '../ServerActivityMetrics';

const SERVER_ID = '11111111-1111-4111-8111-111111111111';

function json(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

function renderMetrics() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ServerActivityMetrics serverId={SERVER_ID} />
    </QueryClientProvider>,
  );
}

describe('ServerActivityMetrics', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'jwt', onAuthFailure: () => {} });
    useSession.setState({ status: 'authenticated' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('CA 1: muestra miembros activos, mensajes enviados y nuevos miembros al cambiar el período', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('days=7')) {
        return json({
          serverId: SERVER_ID,
          from: '2026-11-06T00:00:00.000Z',
          to: '2026-11-13T00:00:00.000Z',
          activeMembers: 12,
          messagesSent: 89,
          newMembers: 4,
          hasActivity: true,
          partial: false,
          series: [
            { date: '2026-11-11', activeMembers: 7, messagesSent: 40, newMembers: 2 },
            { date: '2026-11-12', activeMembers: 12, messagesSent: 49, newMembers: 2 },
          ],
        });
      }
      if (url.includes('from=') && url.includes('to=')) {
        return json({
          serverId: SERVER_ID,
          from: '2026-11-01T00:00:00.000Z',
          to: '2026-11-04T00:00:00.000Z',
          activeMembers: 5,
          messagesSent: 18,
          newMembers: 1,
          hasActivity: true,
          partial: false,
          series: [{ date: '2026-11-02', activeMembers: 5, messagesSent: 18, newMembers: 1 }],
        });
      }
      return json({
        serverId: SERVER_ID,
        from: '2026-10-14T00:00:00.000Z',
        to: '2026-11-13T00:00:00.000Z',
        activeMembers: 25,
        messagesSent: 310,
        newMembers: 14,
        hasActivity: true,
        partial: false,
        series: [{ date: '2026-11-12', activeMembers: 25, messagesSent: 310, newMembers: 14 }],
      });
    });

    renderMetrics();

    await waitFor(() => expect(screen.getByTestId('metric-messages-sent').textContent).toBe('310'));
    expect(screen.getByTestId('metric-active-members').textContent).toBe('25');
    expect(screen.getByTestId('metric-new-members').textContent).toBe('14');
    expect(screen.getByRole('img', { name: 'Miembros activos por día' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Mensajes enviados por día' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Nuevos miembros por día' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '7 días' }));
    await waitFor(() => expect(screen.getByTestId('metric-messages-sent').textContent).toBe('89'));
    expect(screen.getByTestId('metric-active-members').textContent).toBe('12');
    expect(screen.getByTestId('metric-new-members').textContent).toBe('4');

    fireEvent.click(screen.getByRole('button', { name: 'Personalizado' }));
    fireEvent.change(screen.getByLabelText('Fecha desde'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Fecha hasta'), { target: { value: '2026-11-03' } });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/ }));

    await waitFor(() => expect(screen.getByTestId('metric-messages-sent').textContent).toBe('18'));
    const customCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('from='));
    const lastCustomCall = customCalls[customCalls.length - 1];
    expect(String(lastCustomCall?.[0])).toContain(encodeURIComponent('2026-11-01T00:00:00.000Z'));
    expect(String(lastCustomCall?.[0])).toContain(encodeURIComponent('2026-11-04T00:00:00.000Z'));
  });

  it('CA 2: muestra aviso contextual cuando no hubo actividad en lugar de un gráfico vacío', async () => {
    fetchMock.mockResolvedValue(
      json({
        serverId: SERVER_ID,
        from: '2026-10-14T00:00:00.000Z',
        to: '2026-11-13T00:00:00.000Z',
        activeMembers: 0,
        messagesSent: 0,
        newMembers: 0,
        hasActivity: false,
        partial: false,
        series: [{ date: '2026-11-12', activeMembers: 0, messagesSent: 0, newMembers: 0 }],
      }),
    );

    renderMetrics();

    const empty = await screen.findByTestId('server-activity-empty');
    expect(empty.textContent).toContain('No hubo actividad en el período seleccionado');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('CA 3: muestra mensaje de acceso restringido cuando el backend devuelve 403', async () => {
    fetchMock.mockResolvedValue(
      json(
        { type: 'about:blank', title: 'Forbidden', status: 403, detail: 'missing admin permissions' },
        403,
        'application/problem+json',
      ),
    );

    renderMetrics();

    const forbidden = await screen.findByTestId('server-activity-forbidden');
    expect(forbidden.textContent).toContain('No tenés permisos de administración para ver las métricas de este servidor.');
  });
});
