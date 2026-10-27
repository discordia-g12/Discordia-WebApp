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

  it('sin avatar nuevo, guarda sin archivo', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<OwnProfileScreen currentUser={me} onBack={vi.fn()} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar /' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]).toHaveLength(1);
  });

  it('el avatar elegido se ve en la vista previa y se manda como archivo al guardar', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<OwnProfileScreen currentUser={me} onBack={vi.fn()} onSave={onSave} />);
    const avatar = new File([new Uint8Array([255, 216, 255])], 'yo.jpg', { type: 'image/jpeg' });

    fireEvent.change(screen.getByLabelText('_cambiar avatar'), { target: { files: [avatar] } });
    const preview = within(screen.getByRole('article', { name: 'Así ven tu perfil' }));
    await waitFor(() => expect(preview.getByRole('img', { name: 'Mar' }).tagName).toBe('IMG'));
    expect(screen.getByText('/ Se sube al guardar.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar /' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Mar' }), avatar));
    // Guardado: el avatar nuevo pasa a ser el del usuario y ya no hay nada pendiente
    await waitFor(() => expect(screen.queryByRole('button', { name: '_restablecer' })).toBeNull());
  });

  it('si no se pudo guardar, el avatar elegido queda para reintentar', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(<OwnProfileScreen currentUser={me} onBack={vi.fn()} onSave={onSave} />);
    const avatar = new File([new Uint8Array([137, 80, 78, 71])], 'yo.png', { type: 'image/png' });

    fireEvent.change(screen.getByLabelText('_cambiar avatar'), { target: { files: [avatar] } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar /' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '_restablecer' })).toBeTruthy();
  });

  it('rechaza un avatar de formato no permitido o de más de 5 MB', () => {
    const onSave = vi.fn();
    render(<OwnProfileScreen currentUser={me} onBack={vi.fn()} onSave={onSave} />);
    const input = screen.getByLabelText('_cambiar avatar');

    fireEvent.change(input, { target: { files: [new File(['GIF89a'], 'yo.gif', { type: 'image/gif' })] } });
    expect(screen.getByRole('alert').textContent).toBe('/ Formato no permitido: usá JPEG, PNG o WebP.');

    const huge = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'yo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [huge] } });
    expect(screen.getByRole('alert').textContent).toBe('/ La imagen pesa más de 5 MB.');
    expect(screen.queryByRole('button', { name: '_restablecer' })).toBeNull();
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
