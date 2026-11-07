import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEnsureChannelSelected } from '../useCurrentServer';
import { useUIStore } from '../../../app/uiStore';
import type { Server } from '../../../types';

const server = (id: string, channelIds: string[] = []) =>
  ({
    id,
    name: id,
    categories: [{ id: `cat-${id}`, name: 'general', channels: channelIds.map((c) => ({ id: c, name: c, type: 'text' })) }],
  }) as unknown as Server;

/** Monta el hook con la lista de servidores ya en el caché (undefined: todavía no llegó). */
function renderWithServers(servers: Server[] | undefined) {
  const queryClient = new QueryClient();
  if (servers) queryClient.setQueryData(['servers'], servers);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useEnsureChannelSelected(), { wrapper });
}

describe('useEnsureChannelSelected', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedServerId: 'home', selectedChannelId: null, selectedDm: null, appView: 'chat' });
  });

  it('si el servidor elegido no es del usuario, vuelve al inicio (no queda un chat vacío)', () => {
    // Por ejemplo, el servidor de la cuenta anterior en esta pestaña
    useUIStore.setState({ selectedServerId: 'ajeno', selectedChannelId: 'c-ajeno', appView: 'chat' });

    renderWithServers([]);

    const ui = useUIStore.getState();
    expect(ui.selectedServerId).toBe('home');
    expect(ui.selectedChannelId).toBeNull();
    expect(ui.appView).toBe('home');
  });

  it('mientras la lista de servidores no llegó, no cambia la selección', () => {
    useUIStore.setState({ selectedServerId: 's1', appView: 'chat' });

    renderWithServers(undefined);

    expect(useUIStore.getState().selectedServerId).toBe('s1');
  });

  it('con el servidor en la lista, lo deja abierto y elige su primer canal de texto', () => {
    useUIStore.setState({ selectedServerId: 's1', selectedChannelId: null, appView: 'chat' });

    renderWithServers([server('s1', ['general'])]);

    const ui = useUIStore.getState();
    expect(ui.selectedServerId).toBe('s1');
    expect(ui.selectedChannelId).toBe('general');
  });
});
