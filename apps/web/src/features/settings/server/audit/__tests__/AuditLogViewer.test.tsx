import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as core from '@discordia/core';
import type { AuditLogEntry, User } from '@discordia/core';
import { AuditLogViewer } from '../AuditLogViewer';
import { AuditLogRow } from '../AuditLogRow';
import { AuditLogDiff } from '../AuditLogDiff';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AuditLogDiff', () => {
  it('renderiza diferencias entre valores antiguos y nuevos', () => {
    const changes = {
      name: { old: 'General', new: 'Anuncios' },
      spam_filter: { old: false, new: true },
    };

    render(<AuditLogDiff changes={changes} />);

    expect(screen.getByText('Nombre')).toBeTruthy();
    expect(screen.getByText('General')).toBeTruthy();
    expect(screen.getByText('Anuncios')).toBeTruthy();
    expect(screen.getByText('Filtro de spam')).toBeTruthy();
  });

  it('no renderiza nada si changes es null o vacío', () => {
    const { container } = render(<AuditLogDiff changes={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('AuditLogRow', () => {
  const mockEntry: AuditLogEntry = {
    id: 'log-1',
    serverId: 's1',
    category: 'members',
    action: 'MEMBER_KICK',
    actorId: 'usr-mod',
    targetId: 'usr-target',
    reason: 'Comportamiento tóxico en el chat',
    changes: {
      roles: { old: ['Miembro'], new: [] },
    },
    createdAt: '2026-11-10T12:00:00Z',
  };

  const mockActor: User = {
    id: 'usr-mod',
    username: 'moderador',
    displayName: 'SuperMod',
    status: 'online',
  } as User;

  const mockTarget: User = {
    id: 'usr-target',
    username: 'troll123',
    displayName: 'UsuarioTroll',
    status: 'offline',
  } as User;

  it('renderiza información del actor, acción, target y motivo', () => {
    render(
      <AuditLogRow
        entry={mockEntry}
        actor={mockActor}
        targetUser={mockTarget}
      />
    );

    expect(screen.getByText('SuperMod')).toBeTruthy();
    expect(screen.getByText('Expulsó a')).toBeTruthy();
    expect(screen.getByText('@UsuarioTroll')).toBeTruthy();
    expect(screen.getByText('/ motivo: Comportamiento tóxico en el chat')).toBeTruthy();
    expect(screen.getByRole('button', { name: '_ver cambios' })).toBeTruthy();
  });

  it('permite alternar la visualización de cambios con _ver cambios', () => {
    render(
      <AuditLogRow
        entry={mockEntry}
        actor={mockActor}
        targetUser={mockTarget}
      />
    );

    const toggle = screen.getByRole('button', { name: '_ver cambios' });
    fireEvent.click(toggle);

    expect(screen.getByRole('region', { name: 'Detalles de los cambios' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '_ocultar cambios' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '_ocultar cambios' }));
    expect(screen.queryByRole('region', { name: 'Detalles de los cambios' })).toBeNull();
  });
});

describe('AuditLogViewer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseHookValues = {
    categoryFilter: 'all' as const,
    setCategoryFilter: vi.fn(),
    actorIdFilter: null,
    setActorIdFilter: vi.fn(),
    actorSearch: '',
    setActorSearch: vi.fn(),
    entries: [] as AuditLogEntry[],
    rawEntries: [] as AuditLogEntry[],
    profiles: {},
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: vi.fn(),
    refetch: vi.fn(),
    isForbidden: false,
    error: null,
    errorMessage: null,
  };

  it('muestra el estado de carga mientras consulta la API', () => {
    vi.spyOn(core, 'useServerAuditLogs').mockReturnValue({
      ...baseHookValues,
      isLoading: true,
    });

    renderWithClient(<AuditLogViewer serverId="s1" />);
    expect(screen.getByRole('status', { name: 'Cargando registro de auditoría' })).toBeTruthy();
  });

  it('muestra mensaje sin permisos cuando isForbidden es true (403)', () => {
    vi.spyOn(core, 'useServerAuditLogs').mockReturnValue({
      ...baseHookValues,
      isForbidden: true,
      error: new Error('Forbidden'),
      errorMessage: 'No tienes permisos de moderación',
    });

    renderWithClient(<AuditLogViewer serverId="s1" />);
    expect(screen.getByText('sin permisos de moderación')).toBeTruthy();
  });

  it('muestra estado vacío cuando no hay acciones registradas', () => {
    vi.spyOn(core, 'useServerAuditLogs').mockReturnValue({
      ...baseHookValues,
    });

    renderWithClient(<AuditLogViewer serverId="s1" />);
    expect(screen.getByText('sin acciones registradas')).toBeTruthy();
  });

  it('renderiza la lista de eventos y permite filtrar por categoría', () => {
    const setCategoryFilter = vi.fn();
    const entry: AuditLogEntry = {
      id: 'log-1',
      serverId: 's1',
      category: 'server',
      action: 'SERVER_UPDATE',
      actorId: 'usr-owner',
      createdAt: '2026-11-10T14:00:00Z',
    };

    vi.spyOn(core, 'useServerAuditLogs').mockReturnValue({
      ...baseHookValues,
      setCategoryFilter,
      entries: [entry],
      rawEntries: [entry],
      profiles: {
        'usr-owner': {
          id: 'usr-owner',
          username: 'owner',
          displayName: 'Dueño Del Servidor',
          status: 'online',
        } as User,
      },
      hasNextPage: true,
    });

    renderWithClient(<AuditLogViewer serverId="s1" />);

    expect(screen.getByText('Dueño Del Servidor')).toBeTruthy();
    expect(screen.getByText('Actualizó los ajustes del servidor')).toBeTruthy();

    const rolesButton = screen.getByRole('button', { name: 'Roles' });
    fireEvent.click(rolesButton);
    expect(setCategoryFilter).toHaveBeenCalledWith('roles');

    expect(screen.getByRole('button', { name: 'Cargar más acciones /' })).toBeTruthy();
  });

  it('permite buscar acciones por nombre de usuario', () => {
    const setActorSearch = vi.fn();

    vi.spyOn(core, 'useServerAuditLogs').mockReturnValue({
      ...baseHookValues,
      setActorSearch,
    });

    renderWithClient(<AuditLogViewer serverId="s1" />);

    const searchInput = screen.getByLabelText(/buscar por usuario/i);
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    expect(setActorSearch).toHaveBeenCalledWith('alice');
  });

  it('permite filtrar por usuario haciendo clic en el autor de una acción', () => {
    const setActorSearch = vi.fn();
    const entry: AuditLogEntry = {
      id: 'log-2',
      serverId: 's1',
      category: 'members',
      action: 'MEMBER_KICK',
      actorId: 'usr-mod',
      createdAt: '2026-11-10T15:00:00Z',
    };

    vi.spyOn(core, 'useServerAuditLogs').mockReturnValue({
      ...baseHookValues,
      setActorSearch,
      entries: [entry],
      rawEntries: [entry],
      profiles: {
        'usr-mod': {
          id: 'usr-mod',
          username: 'moduser',
          displayName: 'Moderador Alfa',
          status: 'online',
        } as User,
      },
    });

    renderWithClient(<AuditLogViewer serverId="s1" />);

    const actorButton = screen.getByTitle('Filtrar acciones de Moderador Alfa');
    fireEvent.click(actorButton);

    expect(setActorSearch).toHaveBeenCalledWith('Moderador Alfa');
  });
});
