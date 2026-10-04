import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { VoiceParticipantMenu } from '../VoiceParticipantMenu';
import { VoiceView } from '../VoiceView';
import { User } from '../../types';

const me: User = { id: 'auth0|me', username: 'me', displayName: 'Yo', status: 'online' };
const other: User = { id: 'auth0|otro', username: 'otro', displayName: 'Otro', status: 'online' };

afterEach(() => cleanup());

describe('VoiceParticipantMenu', () => {
  const renderMenu = (props: Partial<React.ComponentProps<typeof VoiceParticipantMenu>> = {}) => {
    const handlers = { onToggleLocalMute: vi.fn(), onViewProfile: vi.fn(), onClose: vi.fn() };
    render(<VoiceParticipantMenu user={other} x={10} y={10} isLocallyMuted={false} {...handlers} {...props} />);
    return handlers;
  };

  it('silencia para mí al participante y se cierra', () => {
    const { onToggleLocalMute, onClose } = renderMenu();
    fireEvent.click(screen.getByText('Silenciar para mí'));
    expect(onToggleLocalMute).toHaveBeenCalledWith('auth0|otro');
    expect(onClose).toHaveBeenCalled();
  });

  it('ofrece dejar de silenciar si ya estaba silenciado', () => {
    const { onToggleLocalMute } = renderMenu({ isLocallyMuted: true });
    fireEvent.click(screen.getByText('Dejar de silenciar para mí'));
    expect(onToggleLocalMute).toHaveBeenCalledWith('auth0|otro');
  });

  it('abre el perfil del participante', () => {
    const { onViewProfile } = renderMenu();
    fireEvent.click(screen.getByText('Ver perfil'));
    expect(onViewProfile).toHaveBeenCalledWith(other);
  });

  it('se cierra con Escape o con click afuera', () => {
    const { onClose } = renderMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('no se cierra con un click adentro del menú', () => {
    const { onClose } = renderMenu();
    fireEvent.mouseDown(screen.getByRole('menu'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('VoiceView - click derecho sobre participantes', () => {
  const participants = [
    { user: me, isMuted: false },
    { user: other, isMuted: false },
  ];

  it('abre el menú sobre otro participante y silencia solo para mí', () => {
    const onToggleLocalMute = vi.fn();
    render(
      <VoiceView currentUserId={me.id} participants={participants} onToggleLocalMute={onToggleLocalMute} />
    );

    fireEvent.contextMenu(screen.getByText('Otro'));
    fireEvent.click(screen.getByText('Silenciar para mí'));

    expect(onToggleLocalMute).toHaveBeenCalledWith('auth0|otro');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('no abre el menú sobre uno mismo', () => {
    render(<VoiceView currentUserId={me.id} participants={participants} onToggleLocalMute={vi.fn()} />);
    fireEvent.contextMenu(screen.getByText(/Yo/));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('muestra el indicador de silenciado para vos sin cambiar el ícono de micrófono', () => {
    render(
      <VoiceView
        currentUserId={me.id}
        participants={participants}
        locallyMutedUsers={{ [other.id]: true }}
        onToggleLocalMute={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Silenciado para vos')).toBeTruthy();
    // El otro tiene el micrófono abierto: no debe aparecer como "Micrófono silenciado"
    expect(screen.queryByTitle('Micrófono silenciado')).toBeNull();
  });
});
