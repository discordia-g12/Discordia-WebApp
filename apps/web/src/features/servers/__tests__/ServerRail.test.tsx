import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ServerRail } from '../ServerRail';
import type { Server } from '../../../types';

const server = (id: string, name: string, unreadCount = 0) => ({ id, name, unreadCount, categories: [] }) as unknown as Server;

describe('ServerRail (rediseño)', () => {
  const servers = [server('s1', 'torton'), server('s2', 'ibars', 3)];

  it('muestra cada servidor como franja y marca el activo', () => {
    render(<ServerRail servers={servers} selectedServerId="s1" onSelectServer={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Servidor torton' }).getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: 'Servidor ibars, 3 mensajes nuevos' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: 'Mensajes directos' }).getAttribute('aria-current')).toBeNull();
  });

  it('al pasar el mouse despliega la etiqueta con el nombre y la actividad nueva', () => {
    render(<ServerRail servers={servers} selectedServerId="home" onSelectServer={vi.fn()} />);

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Servidor ibars, 3 mensajes nuevos' }).parentElement!);

    const label = screen.getByRole('tooltip');
    expect(label.textContent).toContain(': ibars');
    expect(label.textContent).toContain('3 mensajes nuevos');
  });

  it('las menciones sin leer se anuncian en lugar de los mensajes', () => {
    const mentioned = { ...server('s3', 'menciones', 5), mentions: 2 } as Server;
    render(<ServerRail servers={[mentioned]} selectedServerId="home" onSelectServer={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Servidor menciones, 2 menciones' })).toBeTruthy();
  });

  it('el badge de no leídos muestra el número, también con el servidor abierto', () => {
    const badgeOf = (name: string) => screen.getByRole('button', { name }).querySelector('[data-testid="server-unread"]');
    const { rerender } = render(<ServerRail servers={servers} selectedServerId="home" onSelectServer={vi.fn()} />);

    expect(badgeOf('Servidor torton')).toBeNull();
    expect(badgeOf('Servidor ibars, 3 mensajes nuevos')?.textContent).toBe('3');

    rerender(<ServerRail servers={servers} selectedServerId="s2" onSelectServer={vi.fn()} />);
    expect(badgeOf('Servidor ibars, 3 mensajes nuevos')?.textContent).toBe('3');
  });

  it('el badge muestra las menciones con "@" y pasa a "99+" desde 100', () => {
    const list = [{ ...server('s3', 'menciones', 5), mentions: 2 } as Server, server('s4', 'mucho', 150)];
    render(<ServerRail servers={list} selectedServerId="home" onSelectServer={vi.fn()} />);

    const badges = screen.getAllByTestId('server-unread').map((b) => b.textContent);
    expect(badges).toEqual(['@2', '99+']);
  });

  it('selecciona servidores e inicio, y abre crear y explorar', () => {
    const onSelectServer = vi.fn();
    const onAddServer = vi.fn();
    const onDiscoverServers = vi.fn();
    render(
      <ServerRail
        servers={servers}
        selectedServerId="home"
        onSelectServer={onSelectServer}
        onAddServer={onAddServer}
        onDiscoverServers={onDiscoverServers}
      />
    );

    expect(screen.getByRole('button', { name: 'Mensajes directos' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByRole('button', { name: 'Servidor torton' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mensajes directos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir un servidor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descubrir servidores' }));

    expect(onSelectServer.mock.calls).toEqual([['s1'], ['home']]);
    expect(onAddServer).toHaveBeenCalledTimes(1);
    expect(onDiscoverServers).toHaveBeenCalledTimes(1);
  });

  it('mientras cargan los servidores muestra el esqueleto', () => {
    render(<ServerRail servers={[]} selectedServerId="home" onSelectServer={vi.fn()} isLoading />);

    expect(screen.getByRole('status', { name: 'Cargando' })).toBeTruthy();
  });
});
