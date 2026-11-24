import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { usePresenceQuery } from '@discordia/core';
import { MemberListPanel } from '../MemberListPanel';
import { useCurrentUserStore } from '../../profile/currentUserStore';
import type { User } from '../../../types';

const member = (id: string, displayName: string): User => ({ id, username: id, displayName, status: 'offline' });

vi.mock('@discordia/core', async (importOriginal) => {
  const session = { profile: { user_id: 'auth0|me' } };
  return {
    ...(await importOriginal<typeof import('@discordia/core')>()),
    // Con getState: currentUserStore lee la sesión al cargarse
    useSession: Object.assign((selector: (s: typeof session) => unknown) => selector(session), { getState: () => session }),
    useMyStatusQuery: () => ({ data: 'dnd' }),
    usePresenceQuery: vi.fn(),
  };
});

vi.mock('../useCurrentServer', () => ({
  useCurrentServer: () => ({ currentServer: { roles: [] } }),
  useServerMemberUsers: () => [member('auth0|me', 'Mar'), member('u2', 'lbars'), member('u3', 'Iñaki'), member('u4', 'Nadie')],
}));

vi.mock('../../../app/usersContext', () => ({ useUsers: () => ({ usersMap: {} }) }));

describe('MemberListPanel', () => {
  afterEach(cleanup);

  it('cada miembro con su presencia; el propio con el estado que eligió, sin pedirlo', () => {
    useCurrentUserStore.setState({ currentUser: member('me', 'Mar') });
    vi.mocked(usePresenceQuery).mockReturnValue({ data: { u2: 'idle', u3: 'offline' } } as ReturnType<typeof usePresenceQuery>);

    render(<MemberListPanel />);

    expect(usePresenceQuery).toHaveBeenLastCalledWith(['u2', 'u3', 'u4']);
    const online = screen.getByText('Conectados — 2 /').closest('section')!;
    expect(within(online).getByRole('button', { name: /Ver perfil de Mar/ })).toBeTruthy();
    expect(within(online).getByText('Ausente/')).toBeTruthy();
    // Sin presencia todavía (u4) cuenta como desconectado
    expect(screen.getByText('Desconectados — 2 /')).toBeTruthy();
  });
});
