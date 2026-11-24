import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import {
  useMarkNotificationRead,
  useNotificationPreference,
  useNotificationsQuery,
  type AppNotification,
  type NotificationPreferenceState,
} from '@discordia/core';
import { useUIStore } from '../../../app/uiStore';
import { NotificationList } from '../NotificationList';
import { NotificationLevelMenu } from '../NotificationLevelMenu';
import { useChannelNotifications } from '../useNotificationMenus';
import { ServerRail } from '../../servers/ServerRail';
import { a11yViolations } from '../../../testing/axe';
import { LONG_PRESS_MS } from '../../../ui';
import type { Server, User } from '../../../types';

vi.mock('@discordia/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@discordia/core')>()),
  useNotificationsQuery: vi.fn(),
  useMarkNotificationRead: vi.fn(),
  useMarkAllNotificationsRead: () => ({ mutate: vi.fn() }),
  useServersQuery: () => ({
    data: [{ id: 's1', name: 'Taller', categories: [{ id: 'k1', channels: [{ id: 'c1', name: 'general' }] }] }],
  }),
  useNotificationPreference: vi.fn(),
}));

const users: Record<string, User> = {
  u2: { id: 'u2', username: 'ana', displayName: 'Ana', status: 'online' },
  u3: { id: 'u3', username: 'beto', displayName: 'Beto', status: 'online' },
};
vi.mock('../../../app/usersContext', () => ({
  useUsers: () => ({
    usersMap: users,
    userOrFallback: (id: string) => users[id] ?? { id, username: id, displayName: 'Alguien', status: 'offline' },
  }),
}));

const notification = (id: string, extra: Partial<AppNotification>): AppNotification => ({
  id,
  reason: 'mention',
  serverId: 's1',
  channelId: 'c1',
  threadId: null,
  messageId: `m-${id}`,
  actorId: 'u2',
  preview: 'hola',
  createdAt: new Date().toISOString(),
  readAt: null,
  ...extra,
});

const markRead = vi.fn();
const fetchMore = vi.fn();
function mockInbox(items: AppNotification[], extra: Partial<ReturnType<typeof useNotificationsQuery>> = {}) {
  vi.mocked(useNotificationsQuery).mockReturnValue({
    items,
    unreadCount: items.filter((n) => !n.readAt).length,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    hasMore: false,
    fetchMore,
    isFetchingNextPage: false,
    ...extra,
  } as unknown as ReturnType<typeof useNotificationsQuery>);
}

beforeEach(() => {
  vi.mocked(useMarkNotificationRead).mockReturnValue({ mutate: markRead } as unknown as ReturnType<typeof useMarkNotificationRead>);
  useUIStore.setState({ selectedServerId: 'home', selectedChannelId: null, selectedDm: null, openThread: null });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('centro de notificaciones', () => {
  it('sin avisos lo dice', () => {
    mockInbox([]);
    render(<NotificationList />);
    expect(screen.getByText('No tenés notificaciones')).toBeTruthy();
  });

  it('cada aviso con quién, qué y dónde: DM, mención, respuesta en hilo y mensaje', async () => {
    mockInbox([
      notification('n1', { reason: 'dm', serverId: null, channelId: 'dm-u3', actorId: 'u3' }),
      notification('n2', { reason: 'mention' }),
      notification('n3', { reason: 'thread_reply', threadId: 'p1' }),
      notification('n4', { reason: 'message', readAt: '2026-11-23T10:00:00Z' }),
    ]);
    const { container } = render(<NotificationList />);

    const list = screen.getByRole('list', { name: 'Avisos' });
    const buttons = within(list).getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Sin leer: Beto te escribió, Mensaje directo',
      'Sin leer: Ana te mencionó, Taller › #general',
      'Sin leer: Ana respondió en un hilo, Taller › Hilo en #general',
      'Nuevo mensaje en #general, Taller › #general',
    ]);
    // El avatar de quien escribió
    expect(within(buttons[0]).getByRole('img', { name: 'Beto' })).toBeTruthy();
    expect(await a11yViolations(container)).toEqual([]);
  });

  it('abrir un aviso lo marca leído y lleva a la conversación (y al hilo)', () => {
    const onOpened = vi.fn();
    const reply = notification('n3', { reason: 'thread_reply', threadId: 'p1' });
    mockInbox([reply]);
    render(<NotificationList onOpened={onOpened} />);

    fireEvent.click(screen.getByRole('button', { name: /respondió en un hilo/ }));
    expect(markRead).toHaveBeenCalledWith('n3');
    expect(onOpened).toHaveBeenCalledWith(reply);
    const ui = useUIStore.getState();
    expect(ui.selectedServerId).toBe('s1');
    expect(ui.selectedChannelId).toBe('c1');
    expect(ui.openThread).toEqual({ channelId: 'c1', messageId: 'p1', serverId: 's1' });
  });

  it('un DM lleva al chat con quien escribió; uno leído no se vuelve a marcar', () => {
    mockInbox([notification('n1', { reason: 'dm', serverId: null, channelId: 'dm-u3', actorId: 'u3', readAt: 'ayer' })]);
    render(<NotificationList />);

    fireEvent.click(screen.getByRole('button', { name: /Beto te escribió/ }));
    expect(markRead).not.toHaveBeenCalled();
    expect(useUIStore.getState().selectedDm).toEqual({ type: 'chat', userId: 'u3' });
    expect(useUIStore.getState().openThread).toBeNull();
  });

  it('con más páginas ofrece ver anteriores', () => {
    mockInbox([notification('n1', {})], { hasMore: true });
    render(<NotificationList />);
    fireEvent.click(screen.getByRole('button', { name: /ver anteriores/ }));
    expect(fetchMore).toHaveBeenCalled();
  });
});

function mockPreference(state: Partial<NotificationPreferenceState>) {
  const setLevel = vi.fn().mockResolvedValue({});
  vi.mocked(useNotificationPreference).mockReturnValue({
    preference: undefined,
    level: null,
    muted: false,
    mutedUntil: null,
    effective: { level: 'mentions', muted: false },
    inherited: { level: 'mentions', muted: false },
    setLevel,
    setMuted: vi.fn(),
    isLoading: false,
    isSaving: false,
    ...state,
  });
  return setLevel;
}

describe('preferencias de avisos (click derecho)', () => {
  const target = { scopeType: 'channel', serverId: 's1', channelId: 'c1' } as const;

  it('heredando: marca Heredar con lo heredado, y el tilde va en el nivel efectivo', () => {
    mockPreference({});
    render(<NotificationLevelMenu target={target} name="#general" x={0} y={0} onClose={vi.fn()} />);

    const menu = screen.getByRole('menu', { name: 'Notificaciones de #general' });
    const checked = within(menu).getByRole('menuitemradio', { checked: true });
    expect(checked.textContent).toContain('Heredar');
    expect(checked.textContent).toContain('Solo menciones');
    const effective = within(menu).getByLabelText('Nivel efectivo').closest('button')!;
    expect(effective.textContent).toBe('Solo menciones');
  });

  it('con nivel propio lo marca; elegir otro lo guarda y cierra', () => {
    const setLevel = mockPreference({ level: 'all', effective: { level: 'all', muted: false } });
    const onClose = vi.fn();
    render(<NotificationLevelMenu target={target} name="#general" x={0} y={0} onClose={onClose} />);

    expect(screen.getByRole('menuitemradio', { checked: true }).textContent).toBe('Todos');
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Heredar/ }));
    expect(setLevel).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Nada' }));
    expect(setLevel).toHaveBeenLastCalledWith('none');
  });

  it('click derecho sobre un servidor del rail abre sus avisos', () => {
    mockPreference({});
    const server = { id: 's1', name: 'Taller', categories: [] } as unknown as Server;
    render(<ServerRail servers={[server]} selectedServerId="home" onSelectServer={vi.fn()} />);

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Servidor Taller' }));
    expect(screen.getByRole('menu', { name: 'Notificaciones de Taller' })).toBeTruthy();
    expect(useNotificationPreference).toHaveBeenCalledWith({ scopeType: 'server', serverId: 's1' });
  });

  const renderRail = () => {
    mockPreference({});
    const onSelectServer = vi.fn();
    const server = { id: 's1', name: 'Taller', categories: [] } as unknown as Server;
    render(<ServerRail servers={[server]} selectedServerId="home" onSelectServer={onSelectServer} />);
    return { strip: screen.getByRole('button', { name: 'Servidor Taller' }), onSelectServer };
  };

  it('en táctil, mantener apretado abre el menú y soltar no abre el servidor', () => {
    vi.useFakeTimers();
    try {
      const { strip, onSelectServer } = renderRail();
      fireEvent.pointerDown(strip, { pointerType: 'touch', clientX: 5, clientY: 5 });
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      expect(screen.getByRole('menu', { name: 'Notificaciones de Taller' })).toBeTruthy();
      fireEvent.pointerUp(strip);
      fireEvent.click(strip);
      expect(onSelectServer).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('un toque corto o un deslizamiento (scroll) no abren el menú', () => {
    vi.useFakeTimers();
    try {
      const { strip, onSelectServer } = renderRail();
      fireEvent.pointerDown(strip, { pointerType: 'touch', clientX: 5, clientY: 5 });
      fireEvent.pointerUp(strip);
      fireEvent.click(strip);
      expect(onSelectServer).toHaveBeenCalledWith('s1');

      fireEvent.pointerDown(strip, { pointerType: 'touch', clientX: 5, clientY: 5 });
      // Al empezar a scrollear el navegador cancela el puntero
      fireEvent.pointerCancel(strip);
      act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      expect(screen.queryByRole('menu')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('con el teclado se abre con Shift+F10 o la tecla Menú', () => {
    const { strip } = renderRail();
    fireEvent.keyDown(strip, { key: 'F10', shiftKey: true });
    expect(screen.getByRole('menu', { name: 'Notificaciones de Taller' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.keyDown(strip, { key: 'ContextMenu' });
    expect(screen.getByRole('menu')).toBeTruthy();
  });
});

describe('campana del encabezado (useChannelNotifications)', () => {
  it('abre el menú de nivel del canal y se ve tachada en "Nada"', () => {
    const setLevel = mockPreference({ effective: { level: 'none', muted: false } });
    const { result } = renderHook(() => useChannelNotifications(null, 'dm-u3'));
    expect(useNotificationPreference).toHaveBeenLastCalledWith({ scopeType: 'channel', serverId: null, channelId: 'dm-u3' });
    expect(result.current?.off).toBe(true);

    act(() => result.current?.onOpen('Ana', 10, 20));
    render(<>{result.current?.menu}</>);
    expect(screen.getByRole('menu', { name: 'Notificaciones de Ana' })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitemradio', { name: /^Solo menciones/ }));
    expect(setLevel).toHaveBeenCalledWith('mentions');
  });

  it('silenciado ofrece reactivar', () => {
    const setMuted = vi.fn().mockResolvedValue({});
    mockPreference({ muted: true, effective: { level: 'mentions', muted: true }, setMuted });
    render(<NotificationLevelMenu target={{ scopeType: 'channel', serverId: 's1', channelId: 'c1' }} name="#general" x={0} y={0} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reactivar avisos' }));
    expect(setMuted).toHaveBeenCalledWith(false);
  });

  it('sin canal no hay campana', () => {
    mockPreference({});
    const { result } = renderHook(() => useChannelNotifications('s1', null));
    expect(result.current).toBeUndefined();
  });
});
