import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ChannelSidebar } from '../ChannelSidebar';
import type { Server, User } from '../../../types';

const me = { id: 'me', username: 'mar', displayName: 'Mar', status: 'online' } as User;
const server = {
  id: 's1',
  name: 'torton',
  ownerId: 'other',
  boostLevel: 0,
  categories: [
    { id: 'k1', name: 'Canal de texto', channels: [{ id: 'c1', name: 'general', type: 'text' }, { id: 'c2', name: 'boludeces', type: 'text', unreadCount: 3 }] },
    { id: 'k2', name: 'Canales de voz', channels: [{ id: 'v1', name: 'meet core', type: 'voice' }] },
  ],
} as unknown as Server;

const base = {
  server,
  currentUser: me,
  activeChannelId: 'c1',
  isVoiceConnected: false,
  activeVoiceChannelId: null,
  isMuted: false,
  isDeafened: false,
  onToggleMute: vi.fn(),
  onToggleDeafen: vi.fn(),
  onOpenSettings: vi.fn(),
  onDisconnectVoice: vi.fn(),
};

describe('ChannelSidebar (rediseño)', () => {
  it('muestra las categorías y los canales con punto; el activo marcado y los no leídos', () => {
    render(<ChannelSidebar {...base} onSelectChannel={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Canal de texto \// })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Canal general' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Canal boludeces' }).textContent).toBe('•boludeces3');
  });

  it('colapsa y abre una categoría', () => {
    render(<ChannelSidebar {...base} onSelectChannel={vi.fn()} />);

    const toggle = screen.getByRole('button', { name: /Canal de texto \// });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Canal general' })).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Canal general' })).toBeTruthy();
  });

  it('elegir un canal de voz además se une a la llamada', () => {
    const onSelectChannel = vi.fn();
    const onJoinVoiceChannel = vi.fn();
    render(<ChannelSidebar {...base} onSelectChannel={onSelectChannel} onJoinVoiceChannel={onJoinVoiceChannel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Canal meet core' }));
    expect(onSelectChannel).toHaveBeenCalledWith('v1');
    expect(onJoinVoiceChannel).toHaveBeenCalledWith('v1');
  });

  it('muestra quién está en un canal de voz y quién habla', () => {
    const lbars = { id: 'u2', username: 'lbars', displayName: 'lbars', status: 'online' } as User;
    render(
      <ChannelSidebar {...base} onSelectChannel={vi.fn()} voiceParticipants={{ v1: [{ user: lbars, isSpeaking: true, isMuted: true }] }} />
    );

    const list = screen.getByRole('list', { name: 'Conectados a meet core' });
    expect(within(list).getByText('lbars')).toBeTruthy();
    expect(within(list).getByLabelText('Micrófono silenciado')).toBeTruthy();
  });

  it('el menú del servidor ofrece las acciones y abandonar (no siendo dueña)', () => {
    const onOpenServerSettings = vi.fn();
    const onLeaveServer = vi.fn();
    render(<ChannelSidebar {...base} onSelectChannel={vi.fn()} onOpenServerSettings={onOpenServerSettings} onLeaveServer={onLeaveServer} onDeleteServer={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Menú del servidor torton' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).queryByRole('menuitem', { name: 'Eliminar servidor' })).toBeNull();
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Ajustes del servidor' }));

    expect(onOpenServerSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Escape cierra el menú del servidor', () => {
    render(<ChannelSidebar {...base} onSelectChannel={vi.fn()} onOpenServerSettings={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Menú del servidor torton' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
