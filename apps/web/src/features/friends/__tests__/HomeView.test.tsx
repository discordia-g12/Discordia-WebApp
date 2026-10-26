import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { HomeView } from '../HomeView';
import type { DirectMessage, User } from '../../../types';

const user = (id: string, displayName: string, status: User['status']) =>
  ({ id, username: displayName.toLowerCase(), displayName, status }) as User;

const DMS = [
  { id: 'd1', recipientId: 'u1', recipient: user('u1', 'Ibars', 'online'), unreadCount: 2 },
  { id: 'd2', recipientId: 'u2', recipient: user('u2', 'Martín', 'offline') },
] as DirectMessage[];

/** La lista de DMs va por portal a la barra lateral del layout: en el test, a un div propio. */
function renderHome(props: Partial<Parameters<typeof HomeView>[0]> = {}) {
  const sidebar = document.createElement('div');
  document.body.appendChild(sidebar);
  render(<HomeView sidebarContainer={sidebar} currentUserId="me" directMessages={DMS} {...props} />);
  return within(sidebar);
}

describe('HomeView (rediseño)', () => {
  it('lista los mensajes directos en la barra lateral con su estado y los no leídos', () => {
    const sidebar = renderHome();

    expect(sidebar.getByRole('heading', { name: 'Mensajes directos /' })).toBeTruthy();
    const ibars = sidebar.getByRole('button', { name: /Ibars/ });
    expect(ibars.textContent).toContain('Conectado/');
    expect(ibars.textContent).toContain('2 sin leer');
    expect(sidebar.getByRole('button', { name: /Martín/ }).textContent).toContain('Desconectado/');
  });

  it('busca conversaciones y muestra un vacío si no hay coincidencias', () => {
    const sidebar = renderHome();

    fireEvent.change(sidebar.getByLabelText('Buscar conversaciones'), { target: { value: 'zzz' } });

    expect(sidebar.queryByRole('button', { name: /Ibars/ })).toBeNull();
    expect(sidebar.getByText('sin resultados')).toBeTruthy();
  });

  it('abrir una conversación avisa la selección y la marca como actual', () => {
    const onSelectDirectMessage = vi.fn();
    const sidebar = renderHome({ onSelectDirectMessage, activeDirectMessageId: null });

    fireEvent.click(sidebar.getByRole('button', { name: /Ibars/ }));
    expect(onSelectDirectMessage).toHaveBeenCalledWith('d1');
  });

  it('pestañas de amigos con contador y estados vacíos propios de cada una', () => {
    renderHome();

    expect(screen.getByRole('tab', { name: 'Disponible (0)' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('nadie disponible por ahora')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Todos (0)' }));
    expect(screen.getByText('todavía no tenés amigos')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Pendiente' }));
    expect(screen.getByText('no hay solicitudes pendientes')).toBeTruthy();
    // En pendientes no hay buscador
    expect(screen.queryByLabelText('Buscar amigos')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: 'Bloqueado' }));
    expect(screen.getByText('no bloqueaste a nadie')).toBeTruthy();
  });

  it('desde el vacío de "todos" lleva a añadir amigo, y la solicitud confirma el envío', () => {
    renderHome();
    fireEvent.click(screen.getByRole('tab', { name: 'Todos (0)' }));
    fireEvent.click(screen.getByRole('button', { name: '_añadir amigo' }));

    expect(screen.getByRole('tab', { name: 'Añadir amigo' }).getAttribute('aria-selected')).toBe('true');
    const send = screen.getByRole('button', { name: 'Enviar solicitud /' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('nombre de usuario'), { target: { value: 'danielp' } });
    fireEvent.click(send);

    expect(screen.getByRole('status').textContent).toContain('Tu solicitud de amistad a danielp fue enviada');
  });

  it('el + de mensajes directos abre añadir amigo', () => {
    const sidebar = renderHome();
    fireEvent.click(sidebar.getByRole('button', { name: 'Nuevo mensaje directo' }));

    expect(screen.getByRole('tab', { name: 'Añadir amigo' }).getAttribute('aria-selected')).toBe('true');
  });

  it('muestra ACTIVO AHORA con su estado vacío', () => {
    renderHome();

    const aside = screen.getByRole('complementary', { name: 'Activo ahora' });
    expect(within(aside).getByText('por ahora todo está tranquilo')).toBeTruthy();
  });
});
