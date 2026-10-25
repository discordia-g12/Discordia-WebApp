import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient, useSession } from '@discordia/core';
import { ServerSettingsScreen } from '../server/ServerSettingsScreen';
import type { Server, User } from '../../../types';

const me = { id: 'me', username: 'mar', displayName: 'Mar', status: 'online', points: 840 } as unknown as User;
const server = {
  id: 's1',
  name: 'torton',
  ownerId: 'me',
  boostLevel: 0,
  boostCount: 0,
  members: [],
  roles: [],
  categories: [{ id: 'k1', name: 'Canal de texto', channels: [{ id: 'c1', name: 'general', type: 'text' }] }],
} as unknown as Server;

function renderSettings(props: Partial<Parameters<typeof ServerSettingsScreen>[0]> = {}) {
  const handlers = { onClose: vi.fn(), onUpdateServer: vi.fn(), onInvite: vi.fn(), onDeleteServer: vi.fn(), onLeaveServer: vi.fn() };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ServerSettingsScreen server={server} currentUser={me} {...handlers} {...props} />
    </QueryClientProvider>
  );
  return handlers;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

describe('ServerSettingsScreen (rediseño)', () => {
  beforeEach(() => {
    // Backend falso: por defecto acepta todo y devuelve una lista vacía
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      String(input).endsWith('/channels') && init?.method === 'POST'
        ? json({ id: 'c9', name: 'avisos', type: 'voice', server_id: 's1', position: 0 }, 201)
        : json([])
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    configureClient({ baseUrl: 'http://localhost:8000', getToken: async () => 'tok', onAuthFailure: vi.fn(), timeoutMs: 1000 });
    useSession.setState({ status: 'authenticated' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useSession.setState({ status: 'bootstrapping' });
  });

  it('RESUMEN: la identidad del servidor no tiene endpoint, queda deshabilitada', () => {
    const { onUpdateServer } = renderSettings();

    const identity = screen.getByRole('region', { name: 'Identidad del servidor' });
    expect(within(identity).getByText('próximamente')).toBeTruthy();
    // Deshabilitados por el fieldset: en el navegador no se pueden enfocar ni cliquear
    expect(within(identity).getByLabelText('nombre del servidor').matches(':disabled')).toBe(true);
    expect(within(identity).getByRole('button', { name: 'Guardar /' }).matches(':disabled')).toBe(true);
    expect(onUpdateServer).not.toHaveBeenCalled();
  });

  it('la dueña ve INVITAR y ELIMINAR; quien no lo es, ABANDONAR', () => {
    const { onInvite, onDeleteServer } = renderSettings();
    const menu = within(screen.getByRole('navigation', { name: 'Ajustes del servidor' }));

    fireEvent.click(menu.getByRole('button', { name: 'Invitar' }));
    fireEvent.click(menu.getByRole('button', { name: 'Eliminar' }));
    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(onDeleteServer).toHaveBeenCalledTimes(1);
    expect(menu.queryByRole('button', { name: 'Abandonar' })).toBeNull();
  });

  it('quien no es dueña puede abandonar, no eliminar', () => {
    const { onLeaveServer } = renderSettings({ server: { ...server, ownerId: 'otra' } });
    const menu = within(screen.getByRole('navigation', { name: 'Ajustes del servidor' }));

    expect(menu.queryByRole('button', { name: 'Eliminar' })).toBeNull();
    fireEvent.click(menu.getByRole('button', { name: 'Abandonar' }));
    expect(onLeaveServer).toHaveBeenCalledTimes(1);
  });

  it('CANALES crea un canal contra el backend', async () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Canales' }));

    fireEvent.change(screen.getByLabelText('nombre del canal'), { target: { value: 'avisos' } });
    fireEvent.click(screen.getByRole('radio', { name: 'voz' }));
    fireEvent.change(screen.getByLabelText('categoría'), { target: { value: 'k1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear canal /' }));

    expect(await screen.findByText('Se creó •avisos.')).toBeTruthy();
    const [url, init] = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/channels'))!;
    expect(String(url)).toBe('http://localhost:8000/api/v1/servers/s1/channels');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ name: 'avisos', type: 'voice', category_id: 'k1' });
  });

  it('CANALES muestra el error del backend en castellano', async () => {
    fetchMock.mockResolvedValue(json({ detail: 'duplicate' }, 400));
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Canales' }));

    fireEvent.change(screen.getByLabelText('nombre del canal'), { target: { value: 'general' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear canal /' }));

    expect((await screen.findByRole('alert')).textContent).toBe('/ Ya existe un canal con ese nombre en esta categoría.');
  });

  it('MIEMBROS silencia por 1 hora y expulsa, contra el backend', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/members?')) {
        return json({ items: [{ id: 'm2', user_id: 'u2', nickname: 'lbars', role_ids: [] }], total: 1, limit: 50, offset: 0 });
      }
      if (url.endsWith('/mutes') && init?.method === 'POST') return json({ id: 'mute-1' }, 201);
      if (url.includes('/members/u2') && init?.method === 'DELETE') return new Response(null, { status: 204 });
      return json([]);
    });
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Miembros' }));

    fireEvent.click(await screen.findByRole('button', { name: '_silenciar' }));
    fireEvent.click(screen.getByRole('radio', { name: '1 hora' }));
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar /' }));
    expect(await screen.findByText('lbars quedó silenciado.')).toBeTruthy();
    const mute = fetchMock.mock.calls.find(([u, i]) => String(u).endsWith('/mutes') && i?.method === 'POST')!;
    expect(JSON.parse(mute[1].body)).toEqual({ user_id: 'u2', duration_seconds: 3600 });

    fireEvent.click(screen.getByRole('button', { name: '_expulsar' }));
    fireEvent.change(screen.getByLabelText('motivo (opcional)'), { target: { value: 'spam' } });
    fireEvent.click(screen.getByRole('button', { name: 'Expulsar /' }));
    expect(await screen.findByText('lbars fue expulsado. Puede volver a unirse con una invitación.')).toBeTruthy();
    const kick = fetchMock.mock.calls.find(([u, i]) => String(u).includes('/members/u2') && i?.method === 'DELETE')!;
    expect(String(kick[0])).toBe('http://localhost:8000/api/v1/servers/s1/members/u2?reason=spam');
  });

  it('MEJORAS no tiene backend: deshabilitada con "próximamente"', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Mejoras' }));

    const level = screen.getByRole('region', { name: 'Nivel' });
    expect(within(level).getByText('próximamente')).toBeTruthy();
    expect(within(level).getByRole('button', { name: 'Mejorar (500 puntos) /' }).matches(':disabled')).toBe(true);
  });

  it('ROLES muestra los permisos en castellano con su interruptor', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Roles' }));

    // Sin backend no hay roles: se ve la creación y la lista vacía
    expect(screen.getByRole('region', { name: 'Crear rol' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Roles — 0' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Crear rol /' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
