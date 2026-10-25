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
    expect(screen.getByRole('button', { name: 'Servidor ibars' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: 'Mensajes directos' }).getAttribute('aria-current')).toBeNull();
  });

  it('al pasar el mouse despliega la etiqueta con el nombre y la actividad nueva', () => {
    render(<ServerRail servers={servers} selectedServerId="home" onSelectServer={vi.fn()} />);

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Servidor ibars' }).parentElement!);

    const label = screen.getByRole('tooltip');
    expect(label.textContent).toContain(': ibars');
    expect(label.textContent).toContain('3 mensajes nuevos');
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
