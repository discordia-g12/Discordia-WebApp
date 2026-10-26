import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemberList } from '../MemberList';
import type { User } from '../../../types';

const u = (id: string, displayName: string, status: User['status'], extra: Partial<User> = {}) =>
  ({ id, username: id, displayName, status, ...extra }) as User;

describe('MemberList (rediseño)', () => {
  it('agrupa por conexión con el total, marca a la usuaria y abre perfiles', () => {
    const onSelectMember = vi.fn();
    render(
      <MemberList
        currentUserId="me"
        onSelectMember={onSelectMember}
        members={[u('me', 'Mar', 'online'), u('u2', 'lbars', 'online', { customStatus: 'en clase' }), u('u3', 'Iñaki', 'offline')]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Miembros — 3' })).toBeTruthy();
    const online = screen.getByText('Conectados — 2 /').closest('section')!;
    expect(within(online).getByRole('button', { name: 'Ver perfil de Mar' }).textContent).toContain('(vos)');
    expect(within(online).getByText('en clase/')).toBeTruthy();
    expect(screen.getByText('Desconectados — 1 /')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ver perfil de Iñaki' }));
    expect(onSelectMember).toHaveBeenCalledWith(expect.objectContaining({ id: 'u3' }));
  });
});
