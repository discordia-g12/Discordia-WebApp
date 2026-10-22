import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient, retryBootstrap, setAuthAdapter, setVoicePlatform, useSession } from '@discordia/core';
import App from '../App';

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

    const input = screen.getByPlaceholderText('Message #general');
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

    for (const tab of ['Security & 2FA', 'Discordia Premium', 'Billing & Points', 'Appearance', 'Voice & Audio', 'Notifications', 'My Account & Profile']) {
      fireEvent.click(screen.getAllByText(tab)[0]);
    }

    fireEvent.click(screen.getByTitle('Close settings (ESC)'));
    expect(await screen.findByLabelText('Servidor Torton')).toBeTruthy();
  });

  it('ajustes del servidor: recorre las pestañas y vuelve', async () => {
    renderApp();
    await openServer();

    fireEvent.click(screen.getByRole('heading', { name: /Torton/ }));
    fireEvent.click(await screen.findByText('Ajustes del servidor'));

    for (const tab of ['Roles', 'Emoji', 'Server Boost', 'Channels', 'Moderation', 'Audit Log', 'Members', 'Bans', 'Notifications', 'Overview']) {
      fireEvent.click(screen.getAllByText(tab)[0]);
    }

    fireEvent.click(screen.getByTitle('Close settings (ESC)'));
    expect(await screen.findByText('hola mundo')).toBeTruthy();
  });

  it('abre el modal de crear servidor desde el rail', async () => {
    renderApp();
    fireEvent.click(await screen.findByLabelText('Añadir un servidor'));

    expect(await screen.findByText('Crea tu servidor')).toBeTruthy();
  });

  it('abre el perfil propio desde la barra de usuario', async () => {
    renderApp();
    fireEvent.click(await screen.findByTitle('Ver perfil y estado'));
    fireEvent.click(await screen.findByTitle('Editar perfil'));

    // Vista de perfil a pantalla completa: ya no está el rail
    await waitFor(() => expect(screen.queryByLabelText('Servidor Torton')).toBeNull());
  });

  it('mobile: recorre canales, chat, voz y las hojas de servidor, miembros y perfil', async () => {
    window.innerWidth = 500;
    renderApp();

    // Pantalla de canales del servidor
    fireEvent.click(await screen.findByLabelText('Torton'));
    fireEvent.click(await screen.findByText('general'));

    // Chat a pantalla completa
    fireEvent.click(await screen.findByLabelText('Volver a los canales'));

    // Voz a pantalla completa
    fireEvent.click(await screen.findByText('meet core'));
    fireEvent.click(await screen.findByLabelText('Volver'));

    // Hojas inferiores
    fireEvent.click(await screen.findByLabelText('Ver miembros'));
    expect(await screen.findByText('Miembros del Servidor (0)')).toBeTruthy();
    fireEvent.click(screen.getAllByText('Torton').at(-1)!);
    fireEvent.click(screen.getAllByText('Pilar')[0]);
  });

  it('con pantalla chica usa el shell mobile', async () => {
    window.innerWidth = 500;
    renderApp();

    const nav = await screen.findByLabelText('Mensajes Directos');
    expect(within(document.body).getAllByLabelText('Añadir un servidor').length).toBeGreaterThan(0);
    expect(nav).toBeTruthy();
  });
});
