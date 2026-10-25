import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError, LOCAL_CATEGORY_PREFIX } from '@discordia/core';
import type { Category, Channel } from '../../../types';
import { CreateChannelModal, EditChannelModal } from '../ChannelModals';

afterEach(cleanup);

const channel = { id: 'c1', name: 'general', type: 'text', categoryId: 'k1', topic: '' } as Channel;
const categories = [
  { id: `${LOCAL_CATEGORY_PREFIX}s1-general`, name: 'GENERAL', channels: [] },
  { id: 'k1', name: 'Información', channels: [] },
] as unknown as Category[];

describe('CreateChannelModal', () => {
  it('crea con el tipo elegido y muestra el error del backend sin cerrarse', async () => {
    const onClose = vi.fn();
    const onCreate = vi.fn().mockRejectedValue(new ApiError({ status: 403, detail: 'forbidden' }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<CreateChannelModal categoryId="k1" onClose={onClose} onCreate={onCreate} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Voz' }));
    fireEvent.change(screen.getByLabelText(/Nombre del canal/), { target: { value: 'charla' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear /' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('/ No tenés permisos para crear canales en este servidor.')).toBeTruthy();
    expect(onCreate).toHaveBeenCalledWith('charla', 'voice', 'k1');
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('EditChannelModal', () => {
  it('ofrece solo categorías reales, más "sin categoría"', () => {
    render(<EditChannelModal channel={channel} categories={categories} onClose={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);

    const options = screen.getAllByRole('radio').map((r) => r.textContent);
    expect(options).toEqual(['sin categoría', 'Información']);
    expect(screen.getByRole('radio', { name: 'Información' }).getAttribute('aria-checked')).toBe('true');
  });

  it('eliminar pide confirmación adentro del modal y se puede volver', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<EditChannelModal channel={channel} categories={categories} onClose={onClose} onEdit={vi.fn()} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: '_eliminar canal' }));
    expect(screen.getByRole('alertdialog', { name: '¿Eliminar canal?' })).toBeTruthy();
    // El foco queda en volver, no en eliminar
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '_volver' }));

    fireEvent.click(screen.getByRole('button', { name: '_volver' }));
    expect(screen.getByRole('dialog', { name: 'Editar canal' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '_eliminar canal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar /' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('guarda nombre, tema y categoría', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(<EditChannelModal channel={channel} categories={categories} onClose={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Tema/), { target: { value: 'de todo un poco' } });
    fireEvent.click(screen.getByRole('radio', { name: 'sin categoría' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar /' }));

    await waitFor(() => expect(onEdit).toHaveBeenCalledWith('c1', { name: 'general', topic: 'de todo un poco', categoryId: null }));
  });
});
