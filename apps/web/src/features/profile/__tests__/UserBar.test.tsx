import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserBar, userBarStatus } from '../UserBar';
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

describe('UserBar', () => {
  it('estado con barra final: presencia, estado personalizado o canal de voz', () => {
    expect(userBarStatus({ status: 'invisible' }, false)).toBe('Invisible/');
    expect(userBarStatus({ status: 'online' }, false)).toBe('Conectado/');
    expect(userBarStatus({ status: 'online', customStatus: 'programando' }, false)).toBe('programando/');
    expect(userBarStatus({ status: 'online', customStatus: 'programando' }, true)).toBe('En canal de voz/');
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

  it('en una llamada muestra "En canal de voz/" y permite salir', () => {
    const handlers = renderBar({ inVoiceChannel: true });

    expect(screen.getByText('En canal de voz/')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Salir del canal de voz' }));
    expect(handlers.onDisconnectVoice).toHaveBeenCalledTimes(1);
  });
});
