import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { ApiError, setApiMock, useSession } from '@discordia/core';
import { useUIStore } from '../../../app/uiStore';
import { renderWithDm } from '../../../testing/renderWithDm';
import { UserProfileModal } from '../UserProfileModal';

const renderProfile = (userId: string, onClose = vi.fn(), prepare?: Parameters<typeof renderWithDm>[2]) => {
  const result = renderWithDm(<UserProfileModal userId={userId} currentUserId="u0" onClose={onClose} />, {}, prepare);
  return { ...result, onClose };
};

describe('UserProfileModal', () => {
  afterEach(() => {
    cleanup();
    setApiMock(null);
    useSession.setState({ status: 'unauthenticated' });
  });

  it('muestra datos públicos y servidores en común, sin "próximamente" ni email', async () => {
    renderProfile('u1');

    expect(await screen.findByRole('dialog', { name: 'Sofia Rossi' })).toBeTruthy();
    const mutual = screen.getByRole('region', { name: 'Servidores en común' });
    await waitFor(() => expect(mutual.querySelectorAll('li').length).toBeGreaterThan(0));
    expect(screen.queryByText('próximamente')).toBeNull();
    expect(screen.queryByText(/@.*\.(com|gg)/)).toBeNull();
  });

  it('pide los servidores en común con el id con el que se abrió, no con el canónico', async () => {
    const getMutualServers = vi.fn().mockResolvedValue([{ id: 's1', name: 'Torton' }]);
    renderProfile('google-oauth2|alias', undefined, (mock) => {
      mock.getPublicProfile = vi.fn().mockResolvedValue({
        id: 'auth0|canonico',
        username: 'mar',
        displayName: 'Mar',
        avatarUrl: null,
        bio: null,
        customStatus: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        relationship: 'none',
      });
      mock.getMutualServers = getMutualServers;
    });

    expect(await screen.findByText('Torton')).toBeTruthy();
    expect(getMutualServers).toHaveBeenCalledWith('google-oauth2|alias');
  });

  it('a un amigo se le puede escribir y bloquear, pero no agregar', async () => {
    const { onClose } = renderProfile('u1');

    fireEvent.click(await screen.findByRole('button', { name: '_enviar mensaje' }));

    expect(onClose).toHaveBeenCalled();
    expect(useUIStore.getState().selectedDm).toEqual({ type: 'chat', userId: 'u1' });
    expect(screen.queryByRole('button', { name: '_agregar amigo' })).toBeNull();
    expect(screen.getByRole('button', { name: '_bloquear' })).toBeTruthy();
  });

  it('eliminar amigo pide confirmación', async () => {
    renderProfile('u1');

    fireEvent.click(await screen.findByRole('button', { name: '_eliminar amigo' }));

    expect(useUIStore.getState().confirm.action).toBe('remove-friend');
  });

  it('a un desconocido se lo puede agregar, y después cancelar la solicitud', async () => {
    renderProfile('u3');

    fireEvent.click(await screen.findByRole('button', { name: '_agregar amigo' }));

    expect(await screen.findByRole('button', { name: '_cancelar solicitud' })).toBeTruthy();
  });

  it('con una solicitud recibida ofrece aceptar y rechazar', async () => {
    renderProfile('u5');

    fireEvent.click(await screen.findByRole('button', { name: '_aceptar amistad' }));

    expect(await screen.findByRole('button', { name: '_bloquear' })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: '_aceptar amistad' })).toBeNull());
  });

  it('a un bloqueado no se le escribe: se lo desbloquea', async () => {
    renderProfile('u6');

    expect(await screen.findByRole('button', { name: '_desbloquear' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '_enviar mensaje' })).toBeNull();
    expect(screen.queryByRole('button', { name: '_bloquear' })).toBeNull();
  });

  it('cuenta suspendida o inexistente: "perfil no disponible"', async () => {
    renderProfile('no-existe');

    expect(await screen.findByText('perfil no disponible')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '_enviar mensaje' })).toBeNull();
  });

  it('otro error ofrece reintentar', async () => {
    renderProfile('u1', undefined, (mock) => {
      mock.getPublicProfile = vi.fn().mockRejectedValue(new ApiError({ status: 500, detail: 'x' }));
    });

    expect(await screen.findByText('no se pudo cargar el perfil', {}, { timeout: 8000 })).toBeTruthy();
    expect(screen.getByRole('button', { name: '_reintentar' })).toBeTruthy();
  }, 10000);
});
