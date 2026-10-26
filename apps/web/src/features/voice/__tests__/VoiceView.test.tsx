import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { VoiceView } from '../VoiceView';
import { VoiceControls } from '../VoiceControls';
import type { User } from '../../../types';

const u = (id: string, displayName: string) => ({ id, username: id, displayName, status: 'online' }) as User;

describe('VoiceView (rediseño)', () => {
  it('una ficha por participante, con quién habla y quién tiene el micrófono silenciado', () => {
    render(
      <VoiceView
        channelName="meet core"
        serverName="torton"
        currentUserId="me"
        participants={[
          { user: u('me', 'Mar'), isSpeaking: true },
          { user: u('u2', 'lbars'), isMuted: true },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: '•meet core / torton' })).toBeTruthy();
    const tiles = screen.getByRole('list', { name: 'Participantes de meet core' });
    expect(within(tiles).getByRole('button', { name: 'Mar (vos), hablando' })).toBeTruthy();
    expect(within(tiles).getByRole('button', { name: 'lbars' })).toBeTruthy();
    expect(within(tiles).getByLabelText('Micrófono silenciado')).toBeTruthy();
  });

  it('la última ficha invita a la llamada; elegir actividad todavía no está disponible', () => {
    const onInvite = vi.fn();
    render(<VoiceView channelName="meet core" participants={[{ user: u('me', 'Mar') }]} onInvite={onInvite} />);

    fireEvent.click(screen.getByRole('button', { name: /Invitar a la llamada/ }));
    expect(onInvite).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: /Elegir actividad/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('las columnas del mosaico crecen con la cantidad de fichas', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ user: u(`u${i}`, `Persona ${i}`) }));
    const { rerender } = render(<VoiceView participants={[]} />);
    const grid = () => screen.getByRole('list');

    expect(grid().style.gridTemplateColumns).toBe('repeat(1, minmax(0, 1fr))');
    rerender(<VoiceView participants={many.slice(0, 2)} />);
    expect(grid().style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
    rerender(<VoiceView participants={many} />);
    expect(grid().style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
  });

  it('muestra el estado de la conexión', () => {
    render(<VoiceView participants={[]} connectionState="reconnecting" />);
    expect(screen.getByRole('status').textContent).toBe('reconectando/');
  });
});

describe('VoiceControls', () => {
  it('dice en qué canal estás, vuelve a la llamada y cuelga; cámara y pantalla deshabilitadas', () => {
    const onOpenCall = vi.fn();
    const onDisconnect = vi.fn();
    render(<VoiceControls channelName="meet core" serverName="torton" connectionState="connected" onOpenCall={onOpenCall} onDisconnect={onDisconnect} />);

    const group = screen.getByRole('group', { name: 'Llamada en curso' });
    fireEvent.click(within(group).getByRole('button', { name: /•meet core/ }));
    fireEvent.click(within(group).getByRole('button', { name: 'Salir del canal de voz' }));

    expect(onOpenCall).toHaveBeenCalledTimes(1);
    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect((within(group).getByRole('button', { name: 'Cámara: próximamente' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
