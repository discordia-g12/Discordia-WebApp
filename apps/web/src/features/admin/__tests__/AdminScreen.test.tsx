import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { AdminScreen } from '../AdminScreen';
import type { User } from '../../../types';

const user = { id: 'me', username: 'mar', displayName: 'Mar', status: 'online', bio: '' } as unknown as User;

const renderAdmin = () => {
  const onClose = vi.fn();
  render(<AdminScreen currentUser={user} onClose={onClose} />);
  return { onClose };
};

describe('AdminScreen (prototipo del backoffice)', () => {
  it('abre en USUARIOS y cambia de sección con el menú gigante', () => {
    renderAdmin();

    expect(screen.getByRole('button', { name: 'Usuarios' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('region', { name: 'Usuarios de la plataforma' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Servidores' }));
    expect(screen.getByRole('region', { name: 'Eliminar servidor' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Investigación' }));
    expect(screen.getByRole('region', { name: 'Expediente' })).toBeTruthy();
  });

  it('todas las celdas dicen "próximamente" y sus acciones quedan deshabilitadas', () => {
    renderAdmin();

    for (const section of ['Usuarios', 'Servidores', 'Investigación']) {
      fireEvent.click(screen.getByRole('button', { name: section }));
      const content = screen.getByRole('region', { name: section });
      const cells = within(content).getAllByRole('region');
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) {
        expect(within(cell).getByText('próximamente')).toBeTruthy();
        expect(within(cell).queryAllByRole('button').every((b) => b.matches(':disabled'))).toBe(true);
      }
    }
  });

  it('se cierra con Escape', () => {
    const { onClose } = renderAdmin();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
