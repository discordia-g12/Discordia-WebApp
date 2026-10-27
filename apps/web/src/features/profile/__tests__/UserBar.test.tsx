import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { UserBar } from '../UserBar';
import { userBarStatus } from '../userBarStatus';
import type { User } from '../../../types';

const user = { id: 'me', username: 'mar', displayName: 'Mar', status: 'invisible' } as User;

const renderBar = (props: Partial<Parameters<typeof UserBar>[0]> = {}) => {
  const handlers = {
    onToggleMute: vi.fn(),
    onToggleDeafen: vi.fn(),
    onOpenSettings: vi.fn(),
    onDisconnectVoice: vi.fn(),
  };
  render(<UserBar currentUser={user} isMuted={false} isDeafened={false} {...handlers} {...props} />);
  return handlers;
};

afterEach(cleanup);

describe('UserBar', () => {
  it('estado con barra final: presencia, estado personalizado o canal de voz', () => {
    expect(userBarStatus({ status: 'invisible' }, false)).toBe('Invisible/');
    expect(userBarStatus({ status: 'online' }, false)).toBe('Conectado/');
    expect(userBarStatus({ status: 'online', customStatus: 'programando' }, false)).toBe('programando/');
    expect(userBarStatus({ status: 'online', customStatus: 'programando' }, true)).toBe('En canal de voz/');
    // Mientras vuelve la conexión, eso va primero
    expect(userBarStatus({ status: 'online' }, true, true)).toBe('reconectando/');
  });

  it('muestra nombre y estado, y los controles de micrófono, audio y ajustes', () => {
    const handlers = renderBar();

    expect(screen.getByText('Mar')).toBeTruthy();
    expect(screen.getByText('Invisible/')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar micrófono' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ensordecer audio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes de usuario' }));

    expect(handlers.onToggleMute).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleDeafen).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenSettings).toHaveBeenCalledTimes(1);
    // Fuera de una llamada no hay botón para colgar
    expect(screen.queryByRole('button', { name: 'Salir del canal de voz' })).toBeNull();
  });

  it('micrófono y audio apagados quedan marcados como presionados', () => {
    renderBar({ isMuted: true, isDeafened: true });

    expect(screen.getByRole('button', { name: 'Activar micrófono' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Activar audio' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('sin permiso para hablar, el micrófono queda deshabilitado y lo explica', () => {
    const handlers = renderBar({ isMuted: true, cannotSpeak: true, inVoiceChannel: true });

    const mic = screen.getByRole('button', { name: 'No tenés permiso para hablar en este canal' }) as HTMLButtonElement;
    expect(mic.disabled).toBe(true);
    fireEvent.click(mic);
    expect(handlers.onToggleMute).not.toHaveBeenCalled();
  });

  it('en una llamada muestra "En canal de voz/" y permite salir', () => {
    const handlers = renderBar({ inVoiceChannel: true });

    expect(screen.getByText('En canal de voz/')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Salir del canal de voz' }));
    expect(handlers.onDisconnectVoice).toHaveBeenCalledTimes(1);
  });

  it('reconectando: lo dice en el estado', () => {
    renderBar({ reconnecting: true });
    expect(screen.getByText('reconectando/')).toBeTruthy();
  });

  it('el nombre abre el menú: presencia, estado personalizado y atajos; Escape lo cierra', async () => {
    const onChangeStatus = vi.fn();
    const onSaveCustomStatus = vi.fn();
    const onEditProfile = vi.fn();
    renderBar({ onChangeStatus, onSaveCustomStatus, onEditProfile });

    fireEvent.click(screen.getByTitle('Ver perfil y estado'));
    expect(screen.getByRole('dialog', { name: 'Tu perfil y estado' })).toBeTruthy();
    // Sin puntos ni premium: no se guardan en el backend
    expect(screen.queryByText(/puntos/i)).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: 'Ausente' }));
    expect(onChangeStatus).toHaveBeenCalledWith('idle');

    fireEvent.change(screen.getByLabelText(/Estado personalizado/), { target: { value: '  programando  ' } });
    fireEvent.click(screen.getByRole('button', { name: '_guardar' }));
    expect(onSaveCustomStatus).toHaveBeenCalledWith('programando');

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tu perfil y estado' })).toBeNull());

    fireEvent.click(screen.getByTitle('Ver perfil y estado'));
    fireEvent.click(screen.getByTitle('Editar perfil'));
    expect(onEditProfile).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tu perfil y estado' })).toBeNull());
  });
});
