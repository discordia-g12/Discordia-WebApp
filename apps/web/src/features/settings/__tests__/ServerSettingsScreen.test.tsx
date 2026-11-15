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

  describe('RESUMEN: nombre y descripción (Administrar configuración del servidor)', () => {
    const rawServer = (name: string, description: string | null = null) => ({
      id: 's1', name, description, owner_id: 'me', icon_url: null, banner_url: null, created_at: '2026-01-01T00:00:00Z',
      channels: [], categories: [], my_permissions: 0,
    });
    const patchCalls = () => fetchMock.mock.calls.filter(([u, init]) => String(u).endsWith('/servers/s1') && init?.method === 'PATCH');
    const identity = () => within(screen.getByRole('region', { name: 'Nombre y descripción' }));

    it('CA1: guarda contra la API solo lo que cambió y aplica el servidor que devuelve', async () => {
      fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) =>
        init?.method === 'PATCH' ? json(rawServer('torton 2', 'De todo un poco')) : json([])
      );
      const { onUpdateServer } = renderSettings();
      const cell = identity();
      // Sin cambios no hay nada que guardar
      expect(cell.getByRole('button', { name: 'Guardar /' }).matches(':disabled')).toBe(true);

      fireEvent.change(cell.getByLabelText('nombre del servidor'), { target: { value: '  torton 2  ' } });
      fireEvent.change(cell.getByLabelText('descripción'), { target: { value: 'De todo un poco' } });
      fireEvent.click(cell.getByRole('button', { name: 'Guardar /' }));

      await waitFor(() => expect(onUpdateServer).toHaveBeenCalledTimes(1));
      expect(JSON.parse(String(patchCalls()[0][1].body))).toEqual({ name: 'torton 2', description: 'De todo un poco' });
      expect(onUpdateServer.mock.calls[0][0]).toMatchObject({ id: 's1', name: 'torton 2', description: 'De todo un poco' });
      expect(cell.getByLabelText('nombre del servidor')).toHaveProperty('value', 'torton 2');
      expect(cell.getByRole('status').textContent).toBe('/ guardado');
      expect(cell.getByRole('button', { name: 'Guardar /' }).matches(':disabled')).toBe(true);
    });

    it('CA1: si solo cambió la descripción, no manda el nombre', async () => {
      fetchMock.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) =>
        init?.method === 'PATCH' ? json(rawServer('torton', 'nueva')) : json([])
      );
      const { onUpdateServer } = renderSettings();

      fireEvent.change(identity().getByLabelText('descripción'), { target: { value: 'nueva' } });
      fireEvent.click(identity().getByRole('button', { name: 'Guardar /' }));

      await waitFor(() => expect(onUpdateServer).toHaveBeenCalled());
      expect(JSON.parse(String(patchCalls()[0][1].body))).toEqual({ description: 'nueva' });
    });

    it('CA3: un nombre vacío se avisa sin llamar a la API', () => {
      const { onUpdateServer } = renderSettings();

      fireEvent.change(identity().getByLabelText('nombre del servidor'), { target: { value: '   ' } });
      fireEvent.click(identity().getByRole('button', { name: 'Guardar /' }));

      expect(identity().getByRole('alert').textContent).toBe('/ El nombre no puede quedar vacío.');
      expect(patchCalls()).toHaveLength(0);
      expect(onUpdateServer).not.toHaveBeenCalled();
    });

    it('CA3: si el backend rechaza los datos (422), muestra el error y no cambia nada', async () => {
      fetchMock.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) =>
        init?.method === 'PATCH'
          ? json({ title: 'Validation Error', status: 422, detail: 'Invalid request', invalid_params: [{ name: 'name', reason: 'too long' }] }, 422)
          : json([])
      );
      const { onUpdateServer } = renderSettings();

      fireEvent.change(identity().getByLabelText('nombre del servidor'), { target: { value: 'otro nombre' } });
      fireEvent.click(identity().getByRole('button', { name: 'Guardar /' }));

      expect((await identity().findByRole('alert')).textContent).toBe('/ El nombre tiene que tener entre 1 y 100 caracteres.');
      expect(onUpdateServer).not.toHaveBeenCalled();
      // Lo escrito queda para corregirlo, y se puede volver a intentar
      expect(identity().getByLabelText('nombre del servidor')).toHaveProperty('value', 'otro nombre');
      expect(identity().getByRole('button', { name: 'Guardar /' }).matches(':disabled')).toBe(false);
    });

    it('CA2: si el backend dice que no tiene permiso (403), lo muestra y no cambia nada', async () => {
      fetchMock.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) =>
        init?.method === 'PATCH' ? json({ detail: 'Missing required permission: MANAGE_SERVER' }, 403) : json([])
      );
      // El front todavía lo cree con permiso (p. ej. se lo acaban de sacar): decide el backend
      const { onUpdateServer } = renderSettings({ server: { ...server, ownerId: 'otra', myPermissions: ['MANAGE_SERVER'] } });

      fireEvent.change(identity().getByLabelText('nombre del servidor'), { target: { value: 'hackeado' } });
      fireEvent.click(identity().getByRole('button', { name: 'Guardar /' }));

      expect((await identity().findByRole('alert')).textContent).toBe(
        '/ Necesitás el permiso Gestionar servidor para cambiar la configuración.'
      );
      expect(onUpdateServer).not.toHaveBeenCalled();
    });

    it('CA2: sin Gestionar servidor ni Administrador, RESUMEN no aparece', () => {
      renderSettings({ server: { ...server, ownerId: 'otra', myPermissions: ['MANAGE_CHANNELS'] } });
      const menu = within(screen.getByRole('navigation', { name: 'Ajustes del servidor' }));

      expect(menu.queryByRole('button', { name: 'Resumen' })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Nombre y descripción' })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Actividad del servidor' })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Banner' })).toBeNull();
    });

    it('con Administrador (sin ser dueña) puede editar y ve Actividad del servidor', () => {
      renderSettings({ server: { ...server, ownerId: 'otra', myPermissions: ['ADMINISTRATOR'] } });

      expect(identity().getByLabelText('nombre del servidor').matches(':disabled')).toBe(false);
      expect(screen.getByRole('region', { name: 'Actividad del servidor' })).toBeTruthy();
    });
  });

  describe('RESUMEN: banner', () => {
    const NEW_BANNER = 'https://discordia-g12-media.s3.us-east-1.amazonaws.com/server-icons/banners/nuevo.webp';
    const rawServer = (bannerUrl: string | null) => ({
      id: 's1', name: 'torton', owner_id: 'me', icon_url: null, banner_url: bannerUrl, created_at: '2026-01-01T00:00:00Z',
      channels: [], categories: [],
    });
    const png = () => new File([new Uint8Array([137, 80, 78, 71])], 'banner.png', { type: 'image/png' });
    const bannerCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/servers/s1/banner'));
    const cell = () => within(screen.getByRole('region', { name: 'Banner' }));

    it('CA1: se sube apenas se elige y muestra el que devuelve la API', async () => {
      fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) =>
        String(input).endsWith('/banner') && init?.method === 'PUT' ? json(rawServer(NEW_BANNER)) : json([])
      );
      renderSettings();
      expect(cell().getByText('sin banner')).toBeTruthy();

      fireEvent.change(cell().getByLabelText('_cambiar banner'), { target: { files: [png()] } });

      await waitFor(() => expect(cell().getByRole('img', { name: 'Banner de torton' }).getAttribute('src')).toBe(NEW_BANNER));
      const [, init] = bannerCalls()[0];
      expect(init.method).toBe('PUT');
      expect(((init.body as FormData).get('banner') as File).name).toBe('banner.png');
    });

    it('_quitar banner lo borra', async () => {
      fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) =>
        String(input).endsWith('/banner') && init?.method === 'DELETE' ? json(rawServer(null)) : json([])
      );
      renderSettings({ server: { ...server, banner: 'https://x/viejo.webp' } });

      fireEvent.click(cell().getByRole('button', { name: '_quitar banner' }));

      await waitFor(() => expect(cell().getByText('sin banner')).toBeTruthy());
      expect(bannerCalls()[0][1].method).toBe('DELETE');
    });

    it('CA3: una imagen que el backend rechaza (400) muestra el error y deja el banner como estaba', async () => {
      fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
        String(input).endsWith('/banner') ? json({ detail: 'Unsupported format. Use JPEG, PNG or WebP.' }, 400) : json([])
      );
      renderSettings({ server: { ...server, banner: 'https://x/viejo.webp' } });

      fireEvent.change(cell().getByLabelText('_cambiar banner'), { target: { files: [png()] } });

      expect((await cell().findByRole('alert')).textContent).toBe(
        '/ La imagen no es válida: usá JPEG, PNG o WebP de hasta 5 MB y 4096×4096 px.'
      );
      expect(cell().getByRole('img', { name: 'Banner de torton' }).getAttribute('src')).toBe('https://x/viejo.webp');
    });

    it('CA3: un archivo de más de 5 MB no se manda', () => {
      renderSettings();
      const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' });

      fireEvent.change(cell().getByLabelText('_cambiar banner'), { target: { files: [big] } });

      expect(cell().getByRole('alert')).toBeTruthy();
      expect(bannerCalls()).toHaveLength(0);
    });

    it('CA2: sin permiso (403), lo dice', async () => {
      fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
        String(input).endsWith('/banner') ? json({ detail: 'Missing required permission: MANAGE_SERVER' }, 403) : json([])
      );
      renderSettings({ server: { ...server, ownerId: 'otra', myPermissions: ['MANAGE_SERVER'] } });

      fireEvent.change(cell().getByLabelText('_cambiar banner'), { target: { files: [png()] } });

      expect((await cell().findByRole('alert')).textContent).toBe('/ Necesitás el permiso Gestionar servidor para cambiar el banner.');
    });
  });

  describe('RESUMEN: ícono', () => {
    const NEW_ICON = 'https://discordia-g12-media.s3.us-east-1.amazonaws.com/server-icons/nuevo.webp';
    const rawServer = (iconUrl: string | null) => ({
      id: 's1', name: 'torton', owner_id: 'me', icon_url: iconUrl, created_at: '2026-01-01T00:00:00Z', channels: [], categories: [],
    });
    const png = () => new File([new Uint8Array([137, 80, 78, 71])], 'icono.png', { type: 'image/png' });
    const iconCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/servers/s1/icon'));

    it('se sube apenas se elige, como archivo, y muestra el que devuelve la API', async () => {
      fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) =>
        String(input).endsWith('/icon') && init?.method === 'PUT' ? json(rawServer(NEW_ICON)) : json([])
      );
      renderSettings();
      const cell = within(screen.getByRole('region', { name: 'Ícono' }));
      const icon = png();

      fireEvent.change(cell.getByLabelText('_cambiar ícono'), { target: { files: [icon] } });

      await waitFor(() => expect(cell.getByRole('img', { name: 'torton' }).getAttribute('src')).toBe(NEW_ICON));
      const [, init] = iconCalls()[0];
      expect(init.method).toBe('PUT');
      expect(((init.body as FormData).get('icon') as File).name).toBe(icon.name);
      expect(cell.getByRole('button', { name: '_quitar ícono' })).toBeTruthy();
    });

    it('_quitar ícono lo borra y vuelve a las iniciales', async () => {
      fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) =>
        String(input).endsWith('/icon') && init?.method === 'DELETE' ? json(rawServer(null)) : json([])
      );
      renderSettings({ server: { ...server, iconUrl: 'https://x/viejo.webp' } });
      const cell = within(screen.getByRole('region', { name: 'Ícono' }));

      fireEvent.click(cell.getByRole('button', { name: '_quitar ícono' }));

      await waitFor(() => expect(cell.queryByRole('button', { name: '_quitar ícono' })).toBeNull());
      expect(iconCalls()[0][1].method).toBe('DELETE');
      expect(cell.getByRole('img', { name: 'torton' }).tagName).not.toBe('IMG');
    });

    it('sin permiso, lo dice y deja el ícono como estaba', async () => {
      fetchMock.mockImplementation(async (input: RequestInfo | URL) =>
        String(input).endsWith('/icon') ? json({ detail: 'Missing required permission: MANAGE_SERVER' }, 403) : json([])
      );
      // El front todavía lo cree con permiso (p. ej. se lo acaban de sacar): el backend lo rechaza
      renderSettings({ server: { ...server, ownerId: 'otra', myPermissions: ['MANAGE_SERVER'] } });
      const cell = within(screen.getByRole('region', { name: 'Ícono' }));

      fireEvent.change(cell.getByLabelText('_cambiar ícono'), { target: { files: [png()] } });

      expect((await cell.findByRole('alert')).textContent).toBe('/ Necesitás el permiso Gestionar servidor para cambiar el ícono.');
      expect(cell.getByRole('img', { name: 'torton' }).tagName).not.toBe('IMG');
    });

    it('un formato no permitido no se manda', () => {
      renderSettings();
      const cell = within(screen.getByRole('region', { name: 'Ícono' }));

      fireEvent.change(cell.getByLabelText('_cambiar ícono'), { target: { files: [new File(['GIF89a'], 'a.gif', { type: 'image/gif' })] } });

      expect(cell.getByRole('alert').textContent).toBe('/ Formato no permitido: usá JPEG, PNG o WebP.');
      expect(iconCalls()).toHaveLength(0);
    });
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

  it('ROLES permite reordenar roles hacia arriba y hacia abajo llamando al endpoint', async () => {
    const rolesList = [
      { id: 'r0', name: '@everyone', color: null, position: 0, permissions_bitmask: 0, is_default: true },
      { id: 'r1', name: 'Moderador', color: '#ff0000', position: 1, permissions_bitmask: 4, is_default: false },
      { id: 'r2', name: 'VIP', color: '#00ff00', position: 2, permissions_bitmask: 0, is_default: false },
    ];

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/servers/s1/roles')) {
        return json(rolesList);
      }
      if (url.endsWith('/servers/s1/roles/order') && init?.method === 'PUT') {
        const body = JSON.parse(init.body as string);
        return json(body.role_ids.map((id: string, idx: number) => ({ id, position: idx })));
      }
      return json([]);
    });

    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Roles' }));

    expect(await screen.findByRole('region', { name: 'Roles — 3' })).toBeTruthy();

    const upModerador = screen.getByRole('button', { name: 'Subir Moderador' });
    fireEvent.click(upModerador);

    await waitFor(() => {
      const orderCall = fetchMock.mock.calls.find(
        ([u, i]) => String(u).endsWith('/servers/s1/roles/order') && i?.method === 'PUT'
      );
      expect(orderCall).toBeTruthy();
      expect(JSON.parse(orderCall![1].body)).toEqual({ role_ids: ['r1', 'r0', 'r2'] });
    });
  });

  it('MIEMBROS: dueña puede iniciar transferencia de propiedad pidiendo confirmación', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/members?')) {
        return json({ items: [{ id: 'm2', user_id: 'u2', nickname: 'lbars', role_ids: [] }], total: 1, limit: 50, offset: 0 });
      }
      if (url.includes('/transfers') && init?.method === 'POST') {
        return json(
          {
            id: 'tr-1',
            server_id: 's1',
            sender_id: 'me',
            target_user_id: 'u2',
            status: 'PENDING',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          201
        );
      }
      return json([]);
    });

    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Miembros' }));

    fireEvent.click(await screen.findByRole('button', { name: '_transferir' }));
    expect(screen.getByText('¿Transferir el servidor?')).toBeTruthy();
    expect(screen.getByText('El servidor pasa a ser de @lbars y perdés el control total sobre él.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Transferir /' }));
    expect(await screen.findByText('Se envió la solicitud de transferencia a lbars.')).toBeTruthy();

    const transferCall = fetchMock.mock.calls.find(([u, i]) => String(u).includes('/transfers') && i?.method === 'POST')!;
    expect(String(transferCall[0])).toBe('http://localhost:8000/api/v1/servers/s1/transfers');
    expect(JSON.parse(transferCall[1].body)).toEqual({ target_user_id: 'u2' });
  });

  describe('Eliminar servidor', () => {
    it('CA 1: owner ve la opción Eliminar en el menú lateral y al tocarla llama a onDeleteServer', () => {
      const { onDeleteServer } = renderSettings({ server: { ...server, ownerId: 'me' } });

      const deleteBtn = screen.getByRole('button', { name: 'Eliminar' });
      expect(deleteBtn).toBeTruthy();
      fireEvent.click(deleteBtn);
      expect(onDeleteServer).toHaveBeenCalledTimes(1);
    });

    it('CA 2: usuario no owner no ve la opción Eliminar (ve Abandonar)', () => {
      const { onLeaveServer } = renderSettings({ server: { ...server, ownerId: 'other-user' } });

      expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();

      const leaveBtn = screen.getByRole('button', { name: 'Abandonar' });
      expect(leaveBtn).toBeTruthy();
      fireEvent.click(leaveBtn);
      expect(onLeaveServer).toHaveBeenCalledTimes(1);
    });
  });
});
