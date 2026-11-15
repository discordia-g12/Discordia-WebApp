import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as core from '@discordia/core';
import type { Channel, Message, User } from '../../../types';
import { MessageSearchDialog } from '../MessageSearchModal';

/** Búsqueda de mensajes: CA 1 (texto), CA 2 (autor) y CA 3 (sin resultados). */

type SearchState = ReturnType<typeof core.useMessageSearch>;

const ana = { id: 'auth0|ana', username: 'ana', displayName: 'Ana B', status: 'online' } as User;
const beto = { id: 'auth0|beto', username: 'beto', displayName: 'Beto', status: 'online' } as User;
const channels = [{ id: 'c1', name: 'general', type: 'text' } as Channel];

const message = (id: string, content: string, authorId = ana.id) =>
  ({ id, content, authorId, channelId: 'c1', timestamp: '2026-11-10T12:00:00.000Z' }) as Message;

function hookState(overrides: Partial<SearchState> = {}): SearchState {
  return {
    query: '',
    setQuery: vi.fn(),
    authorId: null,
    setAuthorId: vi.fn(),
    canSubmit: false,
    submit: vi.fn(),
    clear: vi.fn(),
    submitted: null,
    messages: [],
    isLoading: false,
    isEmpty: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    loadMore: vi.fn(),
    refetch: vi.fn(),
    error: null,
    errorMessage: null,
    ...overrides,
  } as SearchState;
}

function renderDialog(state: SearchState, onOpenMessage = vi.fn()) {
  vi.spyOn(core, 'useMessageSearch').mockReturnValue(state);
  render(
    <MessageSearchDialog
      serverId="srv-1"
      serverName="Mi server"
      channels={channels}
      members={[beto, ana]}
      users={{ [ana.id]: ana, [beto.id]: beto }}
      roles={[]}
      onClose={vi.fn()}
      onOpenMessage={onOpenMessage}
    />
  );
  return { onOpenMessage };
}

describe('MessageSearchDialog', () => {
  beforeEach(() => {
    vi.spyOn(core, 'useUserProfiles').mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('el botón de buscar está deshabilitado sin texto ni autor', () => {
    renderDialog(hookState());
    expect((screen.getByRole('button', { name: 'Buscar /' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('escribir el término y enviar ejecuta la búsqueda', () => {
    const state = hookState({ query: 'deploy', canSubmit: true });
    renderDialog(state);

    fireEvent.change(screen.getByLabelText('texto'), { target: { value: 'deploy 2' } });
    expect(state.setQuery).toHaveBeenCalledWith('deploy 2');

    fireEvent.click(screen.getByRole('button', { name: 'Buscar /' }));
    expect(state.submit).toHaveBeenCalled();
  });

  it('muestra los mensajes encontrados con su autor y canal (CA 1)', () => {
    renderDialog(
      hookState({
        submitted: { query: 'deploy', authorId: null },
        messages: [message('m1', 'el deploy salió bien')],
      })
    );

    const results = screen.getByRole('region', { name: 'Resultados de la búsqueda' });
    expect(results.textContent).toContain('el deploy salió bien');
    expect(results.textContent).toContain('Ana B');
    expect(results.textContent).toContain('•general');
  });

  it('el filtro de autor lista los miembros ordenados y elige uno (CA 2)', () => {
    const state = hookState();
    renderDialog(state);

    const select = screen.getByLabelText('autor') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(['cualquiera', 'Ana B', 'Beto']);

    fireEvent.change(select, { target: { value: beto.id } });
    expect(state.setAuthorId).toHaveBeenCalledWith(beto.id);

    fireEvent.change(select, { target: { value: '' } });
    expect(state.setAuthorId).toHaveBeenLastCalledWith(null);
  });

  it('indica que no hay resultados, con lo que se buscó (CA 3)', () => {
    renderDialog(hookState({ submitted: { query: 'nada', authorId: beto.id }, isEmpty: true }));

    expect(screen.getByText('sin resultados')).toBeTruthy();
    expect(screen.getByText(/ningún mensaje contiene "nada" de Beto/)).toBeTruthy();
  });

  it('elegir un resultado lo abre', () => {
    const found = message('m1', 'abrime');
    const { onOpenMessage } = renderDialog(hookState({ submitted: { query: 'abrime', authorId: null }, messages: [found] }));

    fireEvent.click(screen.getByTitle('Ir a •general'));
    expect(onOpenMessage).toHaveBeenCalledWith(found);
  });

  it('ofrece cargar más resultados si hay otra página', () => {
    const state = hookState({ submitted: { query: 'x', authorId: null }, messages: [message('m1', 'x')], hasNextPage: true });
    renderDialog(state);

    fireEvent.click(screen.getByRole('button', { name: 'Cargar más resultados /' }));
    expect(state.loadMore).toHaveBeenCalled();
  });

  it('muestra el error con la opción de reintentar', () => {
    const state = hookState({
      submitted: { query: 'x', authorId: null },
      error: new Error('down'),
      errorMessage: 'La búsqueda no está disponible en este momento.',
    });
    renderDialog(state);

    expect(screen.getByText('no se pudo buscar')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '_reintentar' }));
    expect(state.refetch).toHaveBeenCalled();
  });

  it('muestra la carga mientras busca', () => {
    renderDialog(hookState({ submitted: { query: 'x', authorId: null }, isLoading: true }));
    expect(screen.getByRole('status', { name: 'Buscando mensajes' })).toBeTruthy();
  });
});
