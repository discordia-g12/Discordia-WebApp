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
  const png = () => new File([new Uint8Array([137, 80, 78, 71])], 'icono.png', { type: 'image/png' });

  it('propone un nombre y crea con el que quede, sin ícono si no se eligió', async () => {
    const onCreateServer = vi.fn().mockResolvedValue(undefined);
    render(<CreateServerModal currentUser={{ displayName: 'Pilar' } as never} onClose={vi.fn()} onCreateServer={onCreateServer} />);

    const name = screen.getByLabelText(/Nombre del servidor/) as HTMLInputElement;
    expect(name.value).toBe('Servidor de Pilar');

    fireEvent.change(name, { target: { value: '  Torton  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear /' }));
    await waitFor(() => expect(onCreateServer).toHaveBeenCalledWith({ name: 'Torton' }));
    expect(onCreateServer.mock.calls[0][0]).not.toHaveProperty('icon');
  });

  it('manda el ícono elegido como archivo y muestra la vista previa', async () => {
    const onCreateServer = vi.fn().mockResolvedValue(undefined);
    render(<CreateServerModal currentUser={{ displayName: 'Pilar' } as never} onClose={vi.fn()} onCreateServer={onCreateServer} />);
    const icon = png();

    fireEvent.change(screen.getByLabelText('Ícono del servidor'), { target: { files: [icon] } });
    await waitFor(() => expect(screen.getByRole('img', { name: 'Servidor de Pilar' }).tagName).toBe('IMG'));
    expect(screen.getByText('_elegir otro')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Crear /' }));
    await waitFor(() => expect(onCreateServer).toHaveBeenCalledWith({ name: 'Servidor de Pilar', icon }));
  });

  it('rechaza un formato no permitido sin mandarlo', async () => {
    const onCreateServer = vi.fn().mockResolvedValue(undefined);
    render(<CreateServerModal currentUser={{ displayName: 'Pilar' } as never} onClose={vi.fn()} onCreateServer={onCreateServer} />);
    const gif = new File(['GIF89a'], 'icono.gif', { type: 'image/gif' });

    fireEvent.change(screen.getByLabelText('Ícono del servidor'), { target: { files: [gif] } });
    expect(screen.getByRole('alert').textContent).toBe('/ Formato no permitido: usá JPEG, PNG o WebP.');

    fireEvent.click(screen.getByRole('button', { name: 'Crear /' }));
    await waitFor(() => expect(onCreateServer).toHaveBeenCalledWith({ name: 'Servidor de Pilar' }));
    expect(onCreateServer.mock.calls[0][0]).not.toHaveProperty('icon');
  });

  it('_quitar descarta el ícono elegido', async () => {
    const onCreateServer = vi.fn().mockResolvedValue(undefined);
    render(<CreateServerModal currentUser={{ displayName: 'Pilar' } as never} onClose={vi.fn()} onCreateServer={onCreateServer} />);

    fireEvent.change(screen.getByLabelText('Ícono del servidor'), { target: { files: [png()] } });
    fireEvent.click(await screen.findByRole('button', { name: '_quitar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear /' }));

    await waitFor(() => expect(onCreateServer).toHaveBeenCalledTimes(1));
    expect(onCreateServer.mock.calls[0][0]).not.toHaveProperty('icon');
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
