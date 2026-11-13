import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient } from '@discordia/core';
import { DeleteServerCell } from '../sections/DeleteServerCell';

const SERVER_ID = '3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b';

const DELETED_SERVER = {
  id: SERVER_ID,
  name: 'Los Pibes',
  owner_id: 'auth0|owner',
  member_count: 12,
  deleted_by: 'auth0|staff',
  reason: 'incumplimiento grave de términos',
  deleted_at: '2026-11-12T12:00:00Z',
};

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const requests = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    method: (init as RequestInit)?.method,
    body: (init as RequestInit)?.body,
  }));

describe('Eliminar servidor desde el backoffice', () => {
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

  const fill = (serverId: string, reason: string) => {
    fireEvent.change(screen.getByLabelText(/^id del servidor/i), { target: { value: serverId } });
    fireEvent.change(screen.getByLabelText(/^motivo/i), { target: { value: reason } });
  };

  it('no deja eliminar sin un id UUID válido y un motivo', () => {
    renderWithClient(<DeleteServerCell />);
    const button = screen.getByRole('button', { name: /^Eliminar servidor/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fill('Los Pibes', 'spam');
    expect(button.disabled).toBe(true);
    expect(screen.getByText(/el id es un UUID/)).toBeTruthy();

    fill(SERVER_ID, '   ');
    expect(button.disabled).toBe(true);
  });

  it('pide confirmación explícita y al confirmar ejecuta DELETE permanente (CA 1)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(DELETED_SERVER, 200));
    renderWithClient(<DeleteServerCell />);

    fill(SERVER_ID, 'incumplimiento grave de términos');
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar servidor/ }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/todos sus canales, mensajes y roles de forma permanente/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: /^Eliminar servidor/ }));

    expect(await screen.findByText('Los Pibes fue eliminado permanentemente.')).toBeTruthy();
    const [request] = requests(fetchMock);
    expect(request.url).toBe(`http://api.test/api/v1/admin/servers/${SERVER_ID}`);
    expect(request.method).toBe('DELETE');
    expect(JSON.parse(String(request.body))).toEqual({ reason: 'incumplimiento grave de términos' });
  });

  it('si cancela la confirmación no elimina el servidor', async () => {
    renderWithClient(<DeleteServerCell />);

    fill(SERVER_ID, 'incumplimiento');
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar servidor/ }));

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /cancelar/i }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('muestra el error de permisos cuando un usuario sin staff intenta eliminar (CA 2)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Se requiere rol staff' }, 403));
    renderWithClient(<DeleteServerCell />);

    fill(SERVER_ID, 'incumplimiento');
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar servidor/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Eliminar servidor/ }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Tu cuenta no tiene permisos de staff');
  });

  it.each([
    [404, { detail: 'No existe' }, /No existe un servidor con ese id/],
    [422, { detail: 'Inválido' }, /Revisá el id del servidor/],
  ])('traduce error HTTP %i en un mensaje claro', async (status, body, expected) => {
    fetchMock.mockResolvedValue(jsonResponse(body, status));
    renderWithClient(<DeleteServerCell />);

    fill(SERVER_ID, 'incumplimiento');
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar servidor/ }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Eliminar servidor/ }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(expected);
  });
});
