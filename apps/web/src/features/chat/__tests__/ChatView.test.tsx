import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ChatView } from '../ChatView';
import type { Channel, Message, User } from '../../../types';

const users: Record<string, User> = {
  me: { id: 'me', username: 'mar', displayName: 'Mar', status: 'online' } as User,
  u2: { id: 'u2', username: 'lbars', displayName: 'lbars', status: 'online' } as User,
};

const channel = { id: 'c1', name: 'general', type: 'text' } as Channel;

const msg = (id: string, authorId: string, content: string, timestamp: string, extra: Partial<Message> = {}) =>
  ({ id, authorId, content, timestamp, channelId: 'c1', ...extra }) as Message;

const MESSAGES = [
  msg('m1', 'u2', 'm!skip', '2025-10-20T13:25:00'),
  msg('m2', 'me', 'chat no llego', '2025-10-21T00:54:00', {
    reactions: [{ emoji: '❤️', count: 2, users: ['u2', 'me'], hasReacted: true }],
  }),
  msg('m3', 'u2', 'Muchos éxitos!', '2025-10-21T16:54:00', {
    replyTo: msg('m2', 'me', 'q rindo temprano tecno', '2025-10-21T00:54:00', { author: users.me }),
  }),
];

describe('ChatView (rediseño)', () => {
  it('queda abajo mientras se está abajo, se suelta al subir a leer y vuelve abajo al enviar', () => {
    const { rerender } = render(<ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" />);
    // jsdom no calcula alturas: un historial de 1000 px en una ventana de 400
    const log = screen.getByRole('log');
    let top = 0;
    Object.defineProperty(log, 'scrollHeight', { configurable: true, get: () => 1000 });
    Object.defineProperty(log, 'clientHeight', { configurable: true, get: () => 400 });
    Object.defineProperty(log, 'scrollTop', { configurable: true, get: () => top, set: (v: number) => (top = v) });
    const withMessage = (m: Message) => (
      <ChatView channel={channel} messages={[...MESSAGES, m]} users={users} currentUserId="me" />
    );

    rerender(withMessage(msg('m4', 'u2', 'llegó uno', '2025-10-21T17:00:00')));
    expect(top).toBe(1000);

    // Sube a leer: lo que llega de otros no lo mueve
    top = 200;
    fireEvent.scroll(log);
    rerender(withMessage(msg('m5', 'u2', 'otro más', '2025-10-21T17:01:00')));
    expect(top).toBe(200);

    // Lo que envía uno mismo sí baja
    rerender(withMessage(msg('m6', 'me', 'respondo', '2025-10-21T17:02:00')));
    expect(top).toBe(1000);
  });

  it('muestra los mensajes con autor, fecha y separadores por día', () => {
    render(<ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" />);

    expect(screen.getByRole('heading', { name: '•general' })).toBeTruthy();
    expect(screen.getByText('20 de octubre de 2025')).toBeTruthy();
    expect(screen.getByText('21 de octubre de 2025')).toBeTruthy();
    expect(screen.getByText('20/10/25, 13:25')).toBeTruthy();
    expect(screen.getByText('m!skip')).toBeTruthy();
  });

  it('muestra la respuesta con la cita y las reacciones, y alterna la reacción propia', () => {
    const onToggleReaction = vi.fn();
    render(<ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" onToggleReaction={onToggleReaction} />);

    expect(screen.getByText('@Mar q rindo temprano tecno')).toBeTruthy();
    const reaction = screen.getByRole('button', { name: '❤️ 2' });
    expect(reaction.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(reaction);
    expect(onToggleReaction).toHaveBeenCalledWith('m2', '❤️');
  });

  it('envía con Enter y responde a un mensaje con su id', () => {
    const onSendMessage = vi.fn();
    render(<ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" onSendMessage={onSendMessage} />);

    const first = screen.getByText('m!skip').closest('li')!;
    fireEvent.click(within(first).getByRole('button', { name: '_responder' }));
    expect(screen.getByText(/respondiendo a/).textContent).toContain('@lbars');

    const input = screen.getByPlaceholderText('Enviar mensaje a general');
    fireEvent.change(input, { target: { value: 'dale' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSendMessage).toHaveBeenCalledWith('dale', undefined, 'm1');
    expect(screen.queryByText(/respondiendo a/)).toBeNull();
  });

  it('con mensajes anteriores sin cargar, arriba ofrece cargarlos en vez del comienzo del canal', () => {
    const onLoadOlder = vi.fn();
    const { rerender } = render(
      <ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" hasOlderMessages onLoadOlder={onLoadOlder} />
    );

    expect(screen.queryByText(/este es el comienzo del canal/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '_cargar mensajes anteriores' }));
    expect(onLoadOlder).toHaveBeenCalledTimes(1);

    rerender(
      <ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" hasOlderMessages isLoadingOlder onLoadOlder={onLoadOlder} />
    );
    expect(screen.getByRole('status').textContent).toMatch(/cargando mensajes anteriores/);

    // Ya no quedan más: vuelve el comienzo del canal
    rerender(<ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" onLoadOlder={onLoadOlder} />);
    expect(screen.getByText(/este es el comienzo del canal/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '_cargar mensajes anteriores' })).toBeNull();
  });

  it('al subir cerca del borde de arriba pide los anteriores, pero no al bajar', () => {
    const onLoadOlder = vi.fn();
    render(<ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" hasOlderMessages onLoadOlder={onLoadOlder} />);
    const log = screen.getByRole('log');

    // Al abrir se baja desde arriba: no cuenta
    fireEvent.scroll(log, { target: { scrollTop: 150 } });
    expect(onLoadOlder).not.toHaveBeenCalled();
    fireEvent.scroll(log, { target: { scrollTop: 900 } });
    // El usuario sube hasta cerca del borde
    fireEvent.scroll(log, { target: { scrollTop: 100 } });
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it('el botón de enviar se habilita solo con texto', () => {
    render(<ChatView channel={channel} messages={[]} users={users} currentUserId="me" />);

    const send = screen.getByRole('button', { name: 'enviar /' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText('Enviar mensaje a general'), { target: { value: 'hola' } });
    expect(send.disabled).toBe(false);
  });

  it('sin permiso para escribir, en lugar de la barra solo aparece el aviso', () => {
    render(<ChatView channel={channel} messages={[]} users={users} currentUserId="me" writeBlock="Estás silenciado." />);

    expect(screen.getByRole('status').textContent).toBe('Estás silenciado.');
    expect(screen.queryByRole('button', { name: 'enviar /' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Adjuntar archivo' })).toBeNull();
    expect(screen.queryByPlaceholderText('Enviar mensaje a general')).toBeNull();
  });

  it('el autor edita su mensaje (Enter guarda)', () => {
    const onEditMessage = vi.fn();
    render(<ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" onEditMessage={onEditMessage} />);

    const mine = screen.getByText('chat no llego').closest('li')!;
    // Solo el autor puede editar
    expect(within(screen.getByText('m!skip').closest('li')!).queryByRole('button', { name: '_editar' })).toBeNull();
    fireEvent.click(within(mine).getByRole('button', { name: '_editar' }));

    const input = screen.getByLabelText('Editar mensaje');
    fireEvent.change(input, { target: { value: 'chat no llego (editado)' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onEditMessage).toHaveBeenCalledWith('m2', 'chat no llego (editado)');
  });

  it('los enlaces del encabezado alternan la lista de miembros y los fijados', () => {
    const onToggleMemberList = vi.fn();
    render(
      <ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" isMemberListOpen onToggleMemberList={onToggleMemberList} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'ocultar lista de miembros' }));
    expect(onToggleMemberList).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'mensajes fijados' }));
    expect(screen.getByRole('dialog', { name: 'Mensajes fijados' }).textContent).toContain('todavía no hay mensajes fijados');
  });

  it('en un DM el encabezado tiene _perfil y sus acciones, sin llamadas ni lista de miembros', () => {
    const onOpenUserProfile = vi.fn();
    const onBlock = vi.fn();
    render(
      <ChatView
        directChat={{ conversationId: 'dm-1', user: users.u2 }}
        directActions={[{ label: 'bloquear', onPress: onBlock }]}
        messages={[]}
        users={users}
        currentUserId="me"
        onOpenUserProfile={onOpenUserProfile}
        onToggleMemberList={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'perfil' }));
    fireEvent.click(screen.getByRole('button', { name: 'bloquear' }));
    expect(onOpenUserProfile).toHaveBeenCalledWith('u2');
    expect(onBlock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'llamar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'videollamada' })).toBeNull();
    expect(screen.queryByRole('button', { name: /lista de miembros/ })).toBeNull();
    expect(screen.getByPlaceholderText('Enviar mensaje a @lbars')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Adjuntar archivo' })).toBeTruthy();
  });

  it('en un chat sin conversación no ofrece adjuntar: el primer mensaje es solo texto', () => {
    render(<ChatView directChat={{ conversationId: null, user: users.u2 }} messages={[]} users={users} currentUserId="me" />);

    expect(screen.queryByRole('button', { name: 'Adjuntar archivo' })).toBeNull();
    expect(screen.getByPlaceholderText('Enviar mensaje a @lbars')).toBeTruthy();
  });

  it('mientras carga muestra el esqueleto, no un spinner', () => {
    render(<ChatView channel={channel} messages={[]} users={users} currentUserId="me" isLoading />);

    expect(screen.getByRole('status', { name: 'Cargando mensajes' })).toBeTruthy();
  });
});
