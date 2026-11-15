import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../../api/client';
import { ApiError } from '../../api/errors';
import { searchServerMessages } from '../api';
import { canSearchMessages, messageSearchErrorMessage, useMessageSearch } from '../useMessageSearch';
import { MESSAGE_SEARCH_MAX_LENGTH } from '../types';

vi.mock('../../auth/session', () => ({
  useSession: vi.fn().mockImplementation((selector) => selector({ status: 'authenticated' })),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const message = (id: string, content: string, authorId = 'auth0|ana') => ({
  id,
  content,
  authorId,
  channelId: 'c1',
  createdAt: '2026-11-10T12:00:00.000Z',
  mentions: { users: [], roles: [], everyone: false },
});

const originalFetch = globalThis.fetch;

beforeEach(() => {
  configureClient({ baseUrl: 'http://localhost:8000', getToken: async () => 'jwt-token' });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('searchServerMessages', () => {
  it('hace GET con el texto, el autor y el cursor, y normaliza los mensajes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ messages: [message('m1', 'deploy')], hasMore: true, nextCursor: 'm1' }));
    globalThis.fetch = fetchMock;

    const page = await searchServerMessages('srv-1', { query: 'deploy', authorId: 'auth0|ana', before: 'm9', limit: 25 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'http://localhost:8000/api/v1/chat/servers/srv-1/messages/search?q=deploy&authorId=auth0%7Cana&before=m9&limit=25'
    );
    expect(init.method).toBe('GET');
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe('m1');
    // normalizeMessage completa timestamp a partir de createdAt
    expect(page.messages[0].timestamp).toBe('2026-11-10T12:00:00.000Z');
  });

  it('no manda los filtros vacíos y tolera una respuesta sin campos', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    globalThis.fetch = fetchMock;

    const page = await searchServerMessages('srv-1', { query: '', authorId: 'auth0|ana' });

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/v1/chat/servers/srv-1/messages/search?authorId=auth0%7Cana');
    expect(page).toEqual({ messages: [], hasMore: false, nextCursor: null });
  });
});

describe('canSearchMessages', () => {
  it('pide texto o autor, y un texto que no supere el máximo', () => {
    expect(canSearchMessages({ query: '', authorId: null })).toBe(false);
    expect(canSearchMessages({ query: '   ', authorId: null })).toBe(false);
    expect(canSearchMessages({ query: 'hola', authorId: null })).toBe(true);
    expect(canSearchMessages({ query: '', authorId: 'auth0|ana' })).toBe(true);
    expect(canSearchMessages({ query: 'a'.repeat(MESSAGE_SEARCH_MAX_LENGTH + 1), authorId: null })).toBe(false);
  });
});

describe('messageSearchErrorMessage', () => {
  it('traduce los errores conocidos y usa un genérico para el resto', () => {
    expect(messageSearchErrorMessage(new ApiError({ status: 503 }))).toMatch(/no está disponible/);
    expect(messageSearchErrorMessage(new ApiError({ status: 401 }))).toMatch(/sesión/);
    expect(messageSearchErrorMessage(new ApiError({ status: 400, detail: 'limit must be...' }))).toBe('limit must be...');
    expect(messageSearchErrorMessage(new Error('boom'))).toBe('No se pudo completar la búsqueda.');
  });
});

describe('useMessageSearch', () => {
  function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  it('no busca hasta que se ejecuta la búsqueda', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useMessageSearch('srv-1'), { wrapper });
    act(() => result.current.setQuery('deploy'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.submitted).toBeNull();
    expect(result.current.isEmpty).toBe(false);
  });

  it('busca al ejecutar, con el texto recortado, y pagina con loadMore', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ messages: [message('m2', 'deploy 2')], hasMore: true, nextCursor: 'm2' }))
      .mockResolvedValueOnce(jsonResponse({ messages: [message('m1', 'deploy 1')], hasMore: false, nextCursor: null }));
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useMessageSearch('srv-1'), { wrapper });
    act(() => result.current.setQuery('  deploy '));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(fetchMock.mock.calls[0][0]).toContain('q=deploy&limit=25');
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchMock.mock.calls[1][0]).toContain('before=m2');
    // React Query notifica el cambio en un tick posterior: hay que esperar el nuevo render
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['m2', 'm1']));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('indica que no hay resultados (CA 3)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ messages: [], hasMore: false, nextCursor: null }));

    const { result } = renderHook(() => useMessageSearch('srv-1'), { wrapper });
    act(() => result.current.setAuthorId('auth0|beto'));
    act(() => result.current.submit());

    await waitFor(() => expect(result.current.isEmpty).toBe(true));
  });

  it('clear vuelve al estado inicial', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ messages: [], hasMore: false, nextCursor: null }));

    const { result } = renderHook(() => useMessageSearch('srv-1'), { wrapper });
    act(() => {
      result.current.setQuery('deploy');
      result.current.setAuthorId('auth0|beto');
    });
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.submitted).not.toBeNull());

    act(() => result.current.clear());

    expect(result.current.query).toBe('');
    expect(result.current.authorId).toBeNull();
    expect(result.current.submitted).toBeNull();
  });

  it('submit no hace nada sin texto ni autor', () => {
    const { result } = renderHook(() => useMessageSearch('srv-1'), { wrapper });
    act(() => result.current.submit());
    expect(result.current.submitted).toBeNull();
    expect(result.current.canSubmit).toBe(false);
  });
});
