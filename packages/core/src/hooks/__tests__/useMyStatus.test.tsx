import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMyStatus, setMyStatus } from '../../api/presence';
import { useMyStatusQuery, useSetMyStatusMutation } from '../useMyStatus';

const session = vi.hoisted(() => ({ status: 'authenticated' }));

vi.mock('../../auth/session', () => ({
  useSession: vi.fn().mockImplementation((selector) => selector(session)),
}));

vi.mock('../../api/presence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/presence')>()),
  getMyStatus: vi.fn(),
  setMyStatus: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Los dos hooks con el mismo QueryClient, como en la app. */
const renderMyStatus = () =>
  renderHook(() => ({ query: useMyStatusQuery(), mutation: useSetMyStatusMutation() }), { wrapper });

describe('estado propio', () => {
  beforeEach(() => {
    session.status = 'authenticated';
    vi.mocked(getMyStatus).mockReset();
    vi.mocked(setMyStatus).mockReset();
  });

  it('carga el estado guardado', async () => {
    vi.mocked(getMyStatus).mockResolvedValue('dnd');

    const { result } = renderMyStatus();

    await waitFor(() => expect(result.current.query.data).toBe('dnd'));
  });

  it('sin sesión no lo pide', () => {
    session.status = 'unauthenticated';

    const { result } = renderMyStatus();

    expect(result.current.query.fetchStatus).toBe('idle');
    expect(getMyStatus).not.toHaveBeenCalled();
  });

  it('cambiarlo se ve antes de que responda el backend', async () => {
    vi.mocked(getMyStatus).mockResolvedValue('online');
    let resolve!: (status: 'idle') => void;
    vi.mocked(setMyStatus).mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderMyStatus();
    await waitFor(() => expect(result.current.query.data).toBe('online'));

    act(() => result.current.mutation.mutate('idle'));

    await waitFor(() => expect(result.current.query.data).toBe('idle'));
    expect(setMyStatus).toHaveBeenCalledWith('idle');
    await act(async () => resolve('idle'));
    expect(result.current.query.data).toBe('idle');
  });

  it('si el backend falla vuelve al anterior', async () => {
    vi.mocked(getMyStatus).mockResolvedValue('online');
    vi.mocked(setMyStatus).mockRejectedValue(new Error('503'));
    const { result } = renderMyStatus();
    await waitFor(() => expect(result.current.query.data).toBe('online'));

    act(() => result.current.mutation.mutate('invisible'));

    await waitFor(() => expect(result.current.mutation.isError).toBe(true));
    expect(result.current.query.data).toBe('online');
  });

  it('si falla antes de haber cargado, lo vuelve a pedir', async () => {
    let resolveFirst!: (status: 'online') => void;
    vi.mocked(getMyStatus)
      .mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))
      .mockResolvedValue('idle');
    vi.mocked(setMyStatus).mockRejectedValue(new Error('503'));
    const { result } = renderMyStatus();

    act(() => result.current.mutation.mutate('dnd'));
    await waitFor(() => expect(result.current.mutation.isError).toBe(true));
    resolveFirst('online');

    await waitFor(() => expect(result.current.query.data).toBe('idle'));
  });
});
