import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Server } from '../../../types';

const { createInvite } = vi.hoisted(() => ({ createInvite: vi.fn() }));
vi.mock('@discordia/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@discordia/core')>()),
  createInvite,
  getInvitePreview: vi.fn().mockRejectedValue(new Error('sin vista previa')),
}));

import { CreateServerModal } from '../CreateServerModal';
import { InviteModal } from '../InviteModal';
import { JoinServerModal } from '../JoinServerModal';
import { inviteCodeFrom } from '../serverActions';

const server = { id: 's1', name: 'Torton' } as Server;

beforeEach(() => {
  createInvite.mockReset();
  createInvite.mockResolvedValueOnce({ code: 'abc123' }).mockResolvedValueOnce({ code: 'def456' });
});
afterEach(cleanup);

describe('CreateServerModal', () => {
  it('propone un nombre, crea con el que quede y deja el ícono en próximamente', async () => {
    const onCreateServer = vi.fn().mockResolvedValue(undefined);
    render(<CreateServerModal currentUser={{ displayName: 'Pilar' } as never} onClose={vi.fn()} onCreateServer={onCreateServer} />);

    const name = screen.getByLabelText(/Nombre del servidor/) as HTMLInputElement;
    expect(name.value).toBe('Servidor de Pilar');
    expect(screen.getByText('próximamente')).toBeTruthy();

    fireEvent.change(name, { target: { value: '  Torton  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear /' }));
    await waitFor(() => expect(onCreateServer).toHaveBeenCalledWith({ name: 'Torton' }));
  });
});

describe('JoinServerModal', () => {
  it('si la invitación no sirve, muestra el error en el campo y no se cierra', async () => {
    const onClose = vi.fn();
    const onJoinServer = vi.fn().mockRejectedValue(new Error('La invitación no es válida o ya venció.'));
    render(<JoinServerModal onClose={onClose} onJoinServer={onJoinServer} />);

    fireEvent.change(screen.getByLabelText(/Invitación/), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unirme /' }));

    expect(await screen.findByText('/ La invitación no es válida o ya venció.')).toBeTruthy();
    expect(screen.getByLabelText(/Invitación/).getAttribute('aria-invalid')).toBe('true');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('acepta el enlace entero o solo el código', () => {
    expect(inviteCodeFrom('https://app.discordia.lol/invite/h7K9xQ2')).toBe('h7K9xQ2');
    expect(inviteCodeFrom('https://app.discordia.lol/invite/h7K9xQ2/')).toBe('h7K9xQ2');
    expect(inviteCodeFrom(' h7K9xQ2 ')).toBe('h7K9xQ2');
  });
});

describe('InviteModal', () => {
  it('al abrir genera un enlace de 7 días sin límite de usos', async () => {
    render(<InviteModal server={server} onClose={vi.fn()} />);

    const link = (await screen.findByDisplayValue(/\/invite\/abc123$/)) as HTMLInputElement;
    expect(link.readOnly).toBe(true);
    expect(createInvite).toHaveBeenCalledWith('s1', { maxUses: 0, expiresInSeconds: 604800 });
    expect(screen.getByText('/ Vence en 7 días.')).toBeTruthy();
  });

  it('cambiar una opción no crea otra invitación sola: marca el enlace y ofrece generar otro', async () => {
    render(<InviteModal server={server} onClose={vi.fn()} />);
    await screen.findByDisplayValue(/abc123$/);

    fireEvent.click(screen.getByRole('radio', { name: '30 min' }));
    expect(createInvite).toHaveBeenCalledTimes(1);
    expect(screen.getByText('/ Cambiaste las opciones: este enlace es el anterior.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '_generar otro enlace' }));
    expect(await screen.findByDisplayValue(/def456$/)).toBeTruthy();
    expect(createInvite).toHaveBeenLastCalledWith('s1', { maxUses: 0, expiresInSeconds: 1800 });
  });

  it('si no se puede generar, lo dice y ofrece reintentar', async () => {
    createInvite.mockReset();
    createInvite.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce({ code: 'ok999' });
    render(<InviteModal server={server} onClose={vi.fn()} />);

    expect(await screen.findByText('/ No se pudo generar la invitación.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '_reintentar' }));
    expect(await screen.findByDisplayValue(/ok999$/)).toBeTruthy();
  });
});
