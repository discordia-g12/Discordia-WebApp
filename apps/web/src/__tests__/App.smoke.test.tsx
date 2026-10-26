import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient, retryBootstrap, setAuthAdapter, setVoicePlatform, useSession } from '@discordia/core';
import App from '../App';
import { useUIStore } from '../app/uiStore';
import { a11yViolations } from '../testing/axe';

/**
 * Prueba de humo de la app completa: arranca autenticada contra un backend falso y recorre las
 * pantallas principales. Protege los refactors de estructura (paso 1.4): si un componente deja de
 * recibir algo que necesitaba, se rompe acá aunque compile.
 */

const SERVER = {
  id: 's1',
  name: 'Torton',
  owner_id: 'me',
  created_at: '2026-10-01T00:00:00Z',
  channels: [
    { id: 'c1', name: 'general', type: 'text', server_id: 's1', position: 0 },
    { id: 'v1', name: 'meet core', type: 'voice', server_id: 's1', position: 1 },
  ],
  categories: [],
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** Backend falso: responde por método y ruta; lo que no conoce devuelve una lista vacía. */
function fakeBackend(input: RequestInfo | URL, init?: RequestInit) {
  const url = new URL(String(input));
  const route = `${init?.method ?? 'GET'} ${url.pathname}`;
  switch (route) {
    case 'GET /api/v1/users/me':
      return jsonResponse({ user_id: 'me', username: 'pilar', display_name: 'Pilar' });
    case 'GET /api/v1/servers':
      return jsonResponse([SERVER]);
    case 'GET /api/v1/servers/s1/members':
      return jsonResponse({
        items: [
          { id: 'm1', user_id: 'me', nickname: null, role_ids: [] },
          { id: 'm2', user_id: 'u2', nickname: 'Lbars', role_ids: [] },
        ],
        total: 2,
        limit: 50,
        offset: 0,
      });
    case 'GET /api/v1/chat/channels/c1/messages':
      return jsonResponse({
        messages: [
          { id: 'msg1', content: 'hola mundo', authorId: 'u2', channelId: 'c1', createdAt: '2026-10-20T10:00:00Z', timestamp: '2026-10-20T10:00:00Z' },
        ],
      });
    case 'POST /api/v1/users/bulk':
      return jsonResponse([{ user_id: 'u2', username: 'lbars', display_name: 'Lbars' }]);
    default:
      return jsonResponse([]);
  }
}

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
}

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

async function openServer() {
  fireEvent.click(await screen.findByLabelText('Servidor Torton'));
  await screen.findByText('hola mundo');
}

describe('App (prueba de humo)', () => {
  const originalWebSocket = globalThis.WebSocket;
  const originalWidth = window.innerWidth;

  beforeEach(async () => {
    // El estado de la interfaz es un store global: sin esto cada test arranca donde dejó el anterior
    useUIStore.setState(useUIStore.getInitialState(), true);
    localStorage.setItem('discordia_intro_seen', '1');
    // jsdom no implementa scroll: ChatView baja al último mensaje con scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
    FakeWebSocket.instances = [];
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => fakeBackend(input, init));
    window.innerWidth = 1280;
    window.history.replaceState({}, '', '/');

    configureClient({ baseUrl: 'http://localhost:8000' });
    setVoicePlatform({
      livekit: () => {
        throw new Error('La prueba de humo no entra a canales de voz');
      },
    });
    setAuthAdapter({
      getToken: async () => 'tok',
      getUser: async () => ({ email: 'pilar@discordia.lol' }),
      loginWithCredentials: async () => {},
      signupWithCredentials: async () => {},
      logout: async () => {},
    });
    useSession.setState({ status: 'bootstrapping', profile: null, error: null, pendingEmail: null });
    await retryBootstrap();
  });

  afterEach(() => {
    localStorage.removeItem('discordia_intro_seen');
    cleanup();
    vi.restoreAllMocks();
    globalThis.WebSocket = originalWebSocket;
    window.innerWidth = originalWidth;
  });

  it('arranca autenticada en el inicio, con los servidores en el rail', async () => {
    renderApp();

    expect(await screen.findByLabelText('Servidor Torton')).toBeTruthy();
    expect(screen.getByPlaceholderText('Encuentra o inicia una conversación')).toBeTruthy();
  });

  it('al abrir un servidor muestra sus canales y el historial del primer canal de texto', async () => {
    renderApp();
    await openServer();

    expect(screen.getByLabelText('Canal general')).toBeTruthy();
    expect(screen.getByLabelText('Canal meet core')).toBeTruthy();
    // El autor se resuelve con el perfil que trae /users/bulk
    await waitFor(() => expect(screen.getAllByText('Lbars').length).toBeGreaterThan(0));
  });

  it('envía los mensajes por el WebSocket del canal', async () => {
    renderApp();
    await openServer();

    const chatSocket = await waitFor(() => {
      const ws = FakeWebSocket.instances.find((w) => w.url.includes('/api/v1/chat/channels/c1/ws'));
      expect(ws).toBeTruthy();
      return ws!;
    });
    act(() => chatSocket.open());

    const input = screen.getByPlaceholderText('Enviar mensaje a general');
    fireEvent.change(input, { target: { value: 'hola desde el test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(chatSocket.send).toHaveBeenCalled());
    expect(JSON.parse(chatSocket.send.mock.calls[0][0])).toEqual({ authorId: 'me', content: 'hola desde el test' });
  });

  it('se suscribe a la presencia de los canales de voz del servidor', async () => {
    renderApp();
    await openServer();

    const presence = await waitFor(() => {
      const ws = FakeWebSocket.instances.find((w) => w.url.includes('/ws/voice'));
      expect(ws).toBeTruthy();
      return ws!;
    });
    act(() => presence.open());

    expect(JSON.parse(presence.send.mock.calls[0][0])).toEqual({ type: 'subscribe', channelIds: ['v1'] });
  });

  it('ajustes de usuario: recorre las pestañas y vuelve', async () => {
    renderApp();
    fireEvent.click(await screen.findByLabelText('Ajustes de usuario'));
    // La pantalla de ajustes es un chunk aparte (lazy): se espera a que llegue
    await screen.findByRole('dialog', { name: 'Ajustes de usuario' });

    // Menú de palabras gigantes; cada sección muestra sus celdas
    for (const section of ['Notificación', 'Voz', 'Factura', 'Experiencia', 'Cuenta']) {
      fireEvent.click(screen.getByRole('button', { name: section }));
      expect(screen.getByRole('region', { name: section })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ajustes de usuario' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ajustes de usuario' })).toBeNull());
    expect(await screen.findByLabelText('Servidor Torton')).toBeTruthy();
  });

  it('ajustes del servidor: recorre las pestañas y vuelve', async () => {
    renderApp();
    await openServer();

    fireEvent.click(screen.getByRole('button', { name: 'Menú del servidor Torton' }));
    fireEvent.click(await screen.findByText('Ajustes del servidor'));

    // El chat sigue montado debajo: se busca adentro del diálogo de ajustes
    const settings = within(await screen.findByRole('dialog', { name: 'Ajustes del servidor' }));
    for (const section of ['Roles', 'Miembros', 'Baneos', 'Canales', 'Moderación', 'Notificación', 'Emojis', 'Mejoras', 'Resumen']) {
      fireEvent.click(settings.getByRole('button', { name: section }));
      // La sección es una región con su nombre (y alguna celda adentro puede llamarse igual, como Baneos)
      expect(settings.getAllByRole('region', { name: section }).length).toBeGreaterThan(0);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ajustes del servidor' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ajustes del servidor' })).toBeNull());
    expect(await screen.findByText('hola mundo')).toBeTruthy();
  });

  it('abre el modal de crear servidor desde el rail', async () => {
    renderApp();
    fireEvent.click(await screen.findByLabelText('Añadir un servidor'));

    // Baja como cortina por encima de la grilla y se va con Escape
    expect(await screen.findByRole('dialog', { name: 'Crear servidor' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Crear servidor' })).toBeNull());
  });

  it('abre el perfil propio desde la barra de usuario', async () => {
    renderApp();
    fireEvent.click(await screen.findByTitle('Ver perfil y estado'));
    fireEvent.click(await screen.findByTitle('Editar perfil'));

    // El perfil baja como cortina encima de la grilla (que sigue montada) y se cierra con la ×
    expect(await screen.findByRole('dialog', { name: 'Mi perfil' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar mi perfil' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Mi perfil' })).toBeNull());
  });

  it('la marca de agua sigue el contexto: AMIGOS en el inicio y el nombre del servidor', async () => {
    // La marca de agua es decorativa (aria-hidden): se busca adentro de ella
    const watermark = (word: string) =>
      screen.getAllByText(word).some((el) => el.closest('[aria-hidden="true"]'));
    renderApp();
    await waitFor(() => expect(watermark('Amigos')).toBe(true));

    await openServer();
    await waitFor(() => expect(watermark('Torton')).toBe(true));
    // Una sola barra de usuario: la del layout
    expect(screen.getAllByTitle('Ver perfil y estado')).toHaveLength(1);
  });

  it('un servidor recién abierto sin canal elegido (creado o unido) muestra su primer canal de texto', async () => {
    renderApp();
    await screen.findByLabelText('Servidor Torton');
    // Como queda después de crear un servidor o unirse: el servidor elegido, sin canal suyo
    act(() => useUIStore.setState({ selectedServerId: 's1', selectedChannelId: 'canal-de-otro-servidor', appView: 'home' }));

    expect(await screen.findByText('hola mundo')).toBeTruthy();
    expect(useUIStore.getState().selectedChannelId).toBe('c1');
    expect(useUIStore.getState().appView).toBe('chat');
  });

  it('cerrar sesión pide confirmación con el modal de la app, no con el del navegador', async () => {
    const browserConfirm = vi.spyOn(window, 'confirm');
    renderApp();
    fireEvent.click(await screen.findByLabelText('Ajustes de usuario'));
    fireEvent.click(await screen.findByRole('button', { name: /Cerrar sesión/i }));

    expect(await screen.findByRole('alertdialog', { name: '¿Cerrar sesión?' })).toBeTruthy();
    expect(browserConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '_cancelar' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    // Sigue en los ajustes, con la sesión abierta
    expect(screen.getByRole('dialog', { name: 'Ajustes de usuario' })).toBeTruthy();
  });

  it('sin red: la línea de reconexión arriba y "reconectando/" en la barra de usuario', async () => {
    renderApp();
    await screen.findByTitle('Ver perfil y estado');
    const setOnline = (online: boolean) => {
      Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
      act(() => {
        window.dispatchEvent(new Event(online ? 'online' : 'offline'));
      });
    };

    setOnline(false);
    expect(await screen.findByText('reconectando/')).toBeTruthy();
    expect(screen.getByText('Reconectando')).toBeTruthy();

    setOnline(true);
    await waitFor(() => expect(screen.queryByText('reconectando/')).toBeNull());
    await waitFor(() => expect(screen.queryByText('Reconectando')).toBeNull());
  });

  it('los avisos son la tira nueva, con barra final', async () => {
    renderApp();
    await screen.findByTitle('Ver perfil y estado');
    act(() => useUIStore.getState().showToast('Servidor creado', 'success'));

    expect((await screen.findByText('Servidor creado/')).closest('[role="status"]')).toBeTruthy();
  });

  it('accesibilidad: las pantallas principales no tienen violaciones de axe', async () => {
    renderApp();
    await screen.findByLabelText('Servidor Torton');
    const found: Record<string, string[]> = {};
    const check = async (screenName: string) => {
      const violations = await a11yViolations();
      if (violations.length) found[screenName] = violations;
    };

    await check('inicio');
    await openServer();
    await waitFor(() => expect(screen.getAllByText('Lbars').length).toBeGreaterThan(0));
    await check('chat del servidor');

    fireEvent.click(screen.getByLabelText('Ajustes de usuario'));
    await screen.findByRole('dialog', { name: 'Ajustes de usuario' });
    await check('ajustes de usuario');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ajustes de usuario' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ajustes de usuario' })).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Menú del servidor Torton' }));
    fireEvent.click(await screen.findByText('Ajustes del servidor'));
    await screen.findByRole('dialog', { name: 'Ajustes del servidor' });
    await check('ajustes del servidor');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ajustes del servidor' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ajustes del servidor' })).toBeNull());

    fireEvent.click(screen.getByLabelText('Añadir un servidor'));
    await screen.findByRole('dialog', { name: 'Crear servidor' });
    await check('crear servidor');

    expect(found).toEqual({});
  });

  it('accesibilidad: mobile no tiene violaciones de axe', async () => {
    window.innerWidth = 500;
    renderApp();
    fireEvent.click(await screen.findByRole('button', { name: 'Canal general' }));
    await screen.findByText('hola mundo');

    expect(await a11yViolations()).toEqual([]);
  });

  it('mobile: servidor, chat por WebSocket, miembros y las pestañas de abajo', async () => {
    window.innerWidth = 500;
    renderApp();

    // Servidores: elige el primero solo y lo pone de encabezado
    expect(await screen.findByRole('heading', { name: 'Torton' })).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Canal general' }));

    // El chat es el real: historial y envío por el WebSocket del canal
    expect(await screen.findByText('hola mundo')).toBeTruthy();
    const ws = await waitFor(() => {
      const chat = FakeWebSocket.instances.find((w) => w.url.includes('/api/v1/chat/channels/c1/ws'));
      expect(chat).toBeTruthy();
      return chat!;
    });
    act(() => ws.open());
    fireEvent.change(screen.getByPlaceholderText(/Enviar mensaje/), { target: { value: 'desde el celu' } });
    fireEvent.keyDown(screen.getByPlaceholderText(/Enviar mensaje/), { key: 'Enter' });
    await waitFor(() => expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('desde el celu')));

    // Miembros como pantalla aparte, y la vuelta
    fireEvent.click(screen.getByRole('button', { name: 'mostrar lista de miembros' }));
    expect(await screen.findByText('Lbars')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a •general' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Volver a Torton' }));
    expect(await screen.findByRole('button', { name: 'Canal general' })).toBeTruthy();

    // Pestañas de abajo
    const tabs = within(screen.getByRole('navigation', { name: 'Secciones' }));
    fireEvent.click(tabs.getByRole('button', { name: /Mensajes/ }));
    expect(await screen.findByRole('heading', { name: 'Mensajes' })).toBeTruthy();
    fireEvent.click(tabs.getByRole('button', { name: /Avisos/ }));
    expect(await screen.findByText('por ahora no hay avisos')).toBeTruthy();
    fireEvent.click(tabs.getByRole('button', { name: /Perfil/ }));
    expect(await screen.findByRole('radiogroup', { name: 'Estado' })).toBeTruthy();

    // Volver a Servidores retoma el último servidor
    fireEvent.click(tabs.getByRole('button', { name: /Servidores/ }));
    expect(await screen.findByRole('heading', { name: 'Torton' })).toBeTruthy();
  });

  it('con pantalla chica usa el shell mobile', async () => {
    window.innerWidth = 500;
    renderApp();

    expect(await screen.findByRole('navigation', { name: 'Secciones' })).toBeTruthy();
    expect(screen.getAllByLabelText('Añadir un servidor').length).toBeGreaterThan(0);
  });
});
