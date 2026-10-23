import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { OwnProfileScreen } from '../own-profile/OwnProfileScreen';
import type { User } from '../../../types';

const me = { id: 'me', username: 'mar', displayName: 'Mar', status: 'online', bio: '' } as unknown as User;

describe('OwnProfileScreen (rediseño)', () => {
  it('la vista previa se actualiza mientras se edita', () => {
    render(<OwnProfileScreen currentUser={me} onBack={vi.fn()} onSave={vi.fn()} />);
    const preview = within(screen.getByRole('article', { name: 'Así ven tu perfil' }));

    fireEvent.change(screen.getByLabelText(/nombre visible/), { target: { value: 'Mar M.' } });
    fireEvent.change(screen.getByLabelText('sobre mí'), { target: { value: 'hola' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Ausente' }));

    expect(preview.getByText('Mar M.')).toBeTruthy();
    expect(preview.getByText('hola')).toBeTruthy();
    expect(preview.getByText('@mar · Ausente/')).toBeTruthy();
  });

  it('no deja guardar un nombre inválido y guarda uno válido', async () => {
    const onSave = vi.fn();
    render(<OwnProfileScreen currentUser={me} onBack={vi.fn()} onSave={onSave} />);
    const save = screen.getByRole('button', { name: 'Guardar /' }) as HTMLButtonElement;

    fireEvent.change(screen.getByLabelText(/nombre visible/), { target: { value: 'M' } });
    expect(save.disabled).toBe(true);
    expect(screen.getByText('/ Entre 2 y 32 caracteres.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/nombre visible/), { target: { value: 'Mar' } });
    fireEvent.click(save);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Mar' })));
  });

  it('el banner todavía no se guarda: queda deshabilitado con la aclaración', () => {
    render(<OwnProfileScreen currentUser={me} onBack={vi.fn()} onSave={vi.fn()} />);

    const banner = screen.getByRole('radiogroup', { name: 'Color del banner' });
    expect(within(banner).getAllByRole('radio').every((r) => r.matches(':disabled'))).toBe(true);
    expect(screen.getByText('/ El banner todavía no se guarda en el servidor.')).toBeTruthy();
  });

  it('se cierra con la ×', () => {
    const onBack = vi.fn();
    render(<OwnProfileScreen currentUser={me} onBack={onBack} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar mi perfil' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
