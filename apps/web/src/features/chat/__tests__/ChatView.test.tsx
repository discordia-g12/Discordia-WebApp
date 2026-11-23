import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { useUIStore } from '../../../app/uiStore';
import { dmActions, dmHeaderActions } from '@discordia/core';
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

    // Tocar la cita lleva al mensaje citado y lo marca
    fireEvent.click(screen.getByRole('button', { name: 'Ir al mensaje citado: @Mar: q rindo temprano tecno' }));
    expect(document.querySelector('[data-message-id="m2"]')!.className).toContain('highlighted');
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

  it('respondiendo, tocar la cita de la barra lleva al mensaje citado', () => {
    render(<ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" onSendMessage={vi.fn()} />);
    fireEvent.click(within(screen.getByText('m!skip').closest('li')!).getByRole('button', { name: '_responder' }));
    fireEvent.click(screen.getByRole('button', { name: /Ir al mensaje citado: respondiendo a @lbars/ }));
    expect(document.querySelector('[data-message-id="m1"]')!.className).toContain('highlighted');
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

  it('el autor y los moderadores con permiso pueden eliminar mensajes con confirmación previa', () => {
    const onDeleteMessage = vi.fn();
    const { rerender } = render(
      <ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" onDeleteMessage={onDeleteMessage} />
    );

    const mine = screen.getByText('chat no llego').closest('li')!;
    const others = screen.getByText('m!skip').closest('li')!;

    // 1. El autor ve _eliminar en su mensaje
    const deleteBtn = within(mine).getByRole('button', { name: '_eliminar' });
    expect(deleteBtn).toBeTruthy();

    // 2. Un usuario común no ve _eliminar en mensajes ajenos
    expect(within(others).queryByRole('button', { name: '_eliminar' })).toBeNull();

    // 3. Al clickear _eliminar se abre el diálogo de confirmación
    fireEvent.click(deleteBtn);
    const confirmState = useUIStore.getState().confirm;
    expect(confirmState.action).toBe('delete-message');

    // Confirmar ejecuta onDeleteMessage con el id del mensaje
    confirmState.onConfirm?.();
    expect(onDeleteMessage).toHaveBeenCalledWith('m2');

    // 4. Si el usuario tiene canManageMessages, puede eliminar mensajes ajenos
    rerender(
      <ChatView
        channel={channel}
        messages={MESSAGES}
        users={users}
        currentUserId="me"
        canManageMessages
        onDeleteMessage={onDeleteMessage}
      />
    );
    const othersModerated = screen.getByText('m!skip').closest('li')!;
    expect(within(othersModerated).getByRole('button', { name: '_eliminar' })).toBeTruthy();
  });

  it('muestra el tombstone de mensaje eliminado sin botones de acción', () => {
    const deletedMessages = [
      ...MESSAGES,
      msg('m4', 'u2', '', '2025-10-21T17:30:00', { type: 'deleted' }),
    ];
    render(<ChatView channel={channel} messages={deletedMessages} users={users} currentUserId="me" />);

    const tombstone = screen.getByText('/ este mensaje fue eliminado');
    expect(tombstone).toBeTruthy();

    const row = tombstone.closest('li')!;
    expect(within(row).queryByRole('button', { name: '_editar' })).toBeNull();
    expect(within(row).queryByRole('button', { name: '_eliminar' })).toBeNull();
    expect(within(row).queryByRole('button', { name: '_responder' })).toBeNull();
  });

  it('si el primer mensaje de un usuario fue eliminado, los siguientes mensajes suyos muestran su autor y avatar', () => {
    const list = [
      msg('m1', 'u2', 'hola de u2', '2025-10-21T17:00:00'),
      msg('m2', 'me', '', '2025-10-21T17:01:00', { type: 'deleted' }),
      msg('m3', 'me', 'segundo mensaje mio', '2025-10-21T17:02:00'),
    ];
    render(<ChatView channel={channel} messages={list} users={users} currentUserId="me" />);

    const row3 = screen.getByText('segundo mensaje mio').closest('li')!;
    expect(within(row3).getByText('Mar')).toBeTruthy();
    expect(within(row3).getByLabelText('Ver perfil de Mar')).toBeTruthy();
  });

  it('los íconos del encabezado alternan la lista de miembros, los fijados y las notificaciones', () => {
    const onToggleMemberList = vi.fn();
    render(
      <ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" isMemberListOpen onToggleMemberList={onToggleMemberList} />
    );

    const members = screen.getByRole('button', { name: 'Lista de miembros' });
    expect(members.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(members);
    expect(onToggleMemberList).toHaveBeenCalledTimes(1);

    const pins = screen.getByRole('button', { name: 'Mensajes fijados' });
    fireEvent.click(pins);
    expect(pins.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('dialog', { name: 'Mensajes fijados' }).textContent).toContain('todavía no hay mensajes fijados');

    const bell = screen.getByRole('button', { name: 'Silenciar notificaciones' });
    fireEvent.click(bell);
    expect(bell.getAttribute('aria-pressed')).toBe('true');
  });

  it('fija desde el menú "más" con onPinMessage, y sin permiso no ofrece la opción', () => {
    const onPinMessage = vi.fn();
    const { rerender } = render(
      <ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" onPinMessage={onPinMessage} pinnedMessages={[]} canPinMessages />
    );
    fireEvent.click(screen.getAllByRole('button', { name: '_más' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'fijar mensaje' }));
    expect(onPinMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));

    rerender(
      <ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" onPinMessage={onPinMessage} pinnedMessages={[]} canPinMessages={false} />
    );
    fireEvent.click(screen.getAllByRole('button', { name: '_más' })[0]);
    expect(screen.queryByRole('button', { name: /fijar mensaje/ })).toBeNull();
  });

  it('el panel de fijados muestra los del servidor y permite desfijar si tiene permiso', () => {
    const onPinMessage = vi.fn();
    const pinned = msg('old', 'u2', 'un fijado viejo que no está cargado', '2025-01-01T10:00:00', { isPinned: true });
    const renderWith = (canPinMessages: boolean) => (
      <ChatView
        channel={channel}
        messages={MESSAGES}
        users={users}
        currentUserId="me"
        onPinMessage={onPinMessage}
        pinnedMessages={[pinned]}
        canPinMessages={canPinMessages}
      />
    );
    const { rerender } = render(renderWith(true));

    // El badge cuenta los fijados del servidor, no los de los mensajes cargados
    fireEvent.click(screen.getByRole('button', { name: 'Mensajes fijados (1)' }));
    const panel = screen.getByRole('dialog', { name: 'Mensajes fijados' });
    expect(panel.textContent).toContain('un fijado viejo que no está cargado');
    fireEvent.click(within(panel).getByRole('button', { name: '_desfijar' }));
    expect(onPinMessage).toHaveBeenCalledWith(pinned);

    rerender(renderWith(false));
    expect(within(screen.getByRole('dialog', { name: 'Mensajes fijados' })).queryByRole('button', { name: '_desfijar' })).toBeNull();
  });

  it('tocar un fijado cierra el panel y marca ese mensaje', async () => {
    const pinned = { ...MESSAGES[0], isPinned: true };
    render(<ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" pinnedMessages={[pinned]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mensajes fijados (1)' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ir al mensaje de lbars' }));
    });

    expect(screen.queryByRole('dialog', { name: 'Mensajes fijados' })).toBeNull();
    const row = document.querySelector('[data-message-id="m1"]')!;
    expect(row.className).toContain('highlighted');
    expect(document.querySelector('[data-message-id="m2"]')!.className).not.toContain('highlighted');
  });

  it('para ir a un fijado que no está cargado pide las páginas anteriores', async () => {
    const old = msg('m0', 'u2', 'muy viejo', '2025-10-01T10:00:00', { isPinned: true });
    const view = (messages: Message[]) => (
      <ChatView
        channel={channel}
        messages={messages}
        users={users}
        currentUserId="me"
        pinnedMessages={[old]}
        onLoadUntilMessage={onLoadUntilMessage}
      />
    );
    // Lo que hace loadUntil: el historial vuelve con la página anterior arriba
    const onLoadUntilMessage = vi.fn(async () => {
      rerender(view([old, ...MESSAGES]));
      return true;
    });
    const { rerender } = render(view(MESSAGES));

    fireEvent.click(screen.getByRole('button', { name: 'Mensajes fijados (1)' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ir al mensaje de lbars' }));
    });

    expect(onLoadUntilMessage).toHaveBeenCalledWith('m0');
    expect(document.querySelector('[data-message-id="m0"]')!.className).toContain('highlighted');
  });

  it('si el fijado no aparece en el historial no marca nada', async () => {
    const onLoadUntilMessage = vi.fn().mockResolvedValue(false);
    const gone = msg('gone', 'u2', 'ya no está', '2025-01-01T10:00:00', { isPinned: true });
    render(
      <ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" pinnedMessages={[gone]} onLoadUntilMessage={onLoadUntilMessage} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mensajes fijados (1)' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ir al mensaje de lbars' }));
    });

    expect(onLoadUntilMessage).toHaveBeenCalledWith('gone');
    expect(document.querySelector('[class*="highlighted"]')).toBeNull();
  });

  it('el ícono de búsqueda abre la búsqueda de mensajes, y sin onOpenSearch no aparece', () => {
    const onOpenSearch = vi.fn();
    const { rerender } = render(
      <ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" onOpenSearch={onOpenSearch} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Buscar mensajes' }));
    expect(onOpenSearch).toHaveBeenCalledTimes(1);

    rerender(<ChatView channel={channel} messages={MESSAGES} users={users} currentUserId="me" />);
    expect(screen.queryByRole('button', { name: 'Buscar mensajes' })).toBeNull();
  });

  it('en un DM, buscar abre la búsqueda de la conversación y elegir un resultado va a ese mensaje', async () => {
    const actions = dmActions({ relationship: 'friend', conversation: { id: 'dm-1', status: 'accepted', requestedBy: 'u2', otherUserId: 'u2', unreadCount: 0 } });
    const onAction = vi.fn();
    render(
      <ChatView
        directChat={{ conversationId: 'dm-1', user: { ...users.u2, status: 'online' } }}
        directHeader={{
          layout: (pinned) => dmHeaderActions({ name: 'lbars', actions, hasConversation: true, pinned, search: true }),
          onAction,
        }}
        messages={MESSAGES}
        users={users}
        currentUserId="me"
        renderDirectSearch={({ onClose, onJump }) => (
          <div role="dialog" aria-label="Buscar en el DM">
            <button
              type="button"
              onClick={() => {
                onClose();
                onJump('m1');
              }}
            >
              resultado
            </button>
          </div>
        )}
      />
    );

    const header = within(screen.getByRole('navigation', { name: 'Acciones del chat' }));
    fireEvent.click(header.getByRole('button', { name: 'Buscar mensajes con lbars' }));
    // La resuelve la vista, no onAction
    expect(onAction).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(within(screen.getByRole('dialog', { name: 'Buscar en el DM' })).getByRole('button', { name: 'resultado' }));
    });

    expect(screen.queryByRole('dialog', { name: 'Buscar en el DM' })).toBeNull();
    expect(document.querySelector('[data-message-id="m1"]')!.className).toContain('highlighted');
  });

  it('en un DM el encabezado tiene íconos (dmHeaderActions) y el menú "más", sin lista de miembros', () => {
    const onOpenUserProfile = vi.fn();
    const onAction = vi.fn();
    const actions = dmActions({ relationship: 'friend', conversation: { id: 'dm-1', status: 'accepted', requestedBy: 'u2', otherUserId: 'u2', unreadCount: 0 } });
    render(
      <ChatView
        directChat={{ conversationId: 'dm-1', user: { ...users.u2, status: 'online' } }}
        directHeader={{
          layout: (pinned) => dmHeaderActions({ name: 'lbars', actions, hasConversation: true, pinned }),
          onAction,
        }}
        messages={[]}
        users={users}
        currentUserId="me"
        onOpenUserProfile={onOpenUserProfile}
        onToggleMemberList={vi.fn()}
      />
    );

    const header = within(screen.getByRole('navigation', { name: 'Acciones del chat' }));
    expect(screen.getByText('Conectado/')).toBeTruthy();

    // Perfil y fijados los resuelve la vista; el resto va a onAction
    fireEvent.click(header.getByRole('button', { name: 'Ver el perfil de lbars' }));
    expect(onOpenUserProfile).toHaveBeenCalledWith('u2');
    fireEvent.click(header.getByRole('button', { name: 'Mensajes fijados' }));
    expect(screen.getByRole('dialog', { name: 'Mensajes fijados' })).toBeTruthy();
    fireEvent.click(header.getByRole('button', { name: 'Llamar a lbars' }));
    expect(onAction).toHaveBeenCalledWith('call');

    // Las destructivas, en el menú "más"
    expect(header.queryByRole('button', { name: 'Bloquear a lbars' })).toBeNull();
    fireEvent.click(header.getByRole('button', { name: 'Más opciones' }));
    const menu = screen.getByRole('menu', { name: 'Más opciones' });
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Eliminar amigo', 'Bloquear a lbars']);
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Bloquear a lbars' }));
    expect(onAction).toHaveBeenCalledWith('block');
    expect(screen.queryByRole('menu')).toBeNull();

    expect(header.queryByRole('button', { name: /lista de miembros/i })).toBeNull();
    expect(screen.getByPlaceholderText('Enviar mensaje a @lbars')).toBeTruthy();
  });

  it('el menú "más" se maneja con el teclado y se cierra con Escape', () => {
    const actions = dmActions({ relationship: 'friend', conversation: { id: 'dm-1', status: 'accepted', requestedBy: 'u2', otherUserId: 'u2', unreadCount: 0 } });
    render(
      <ChatView
        directChat={{ conversationId: 'dm-1', user: users.u2 }}
        directHeader={{ layout: () => dmHeaderActions({ name: 'lbars', actions, hasConversation: true }), onAction: vi.fn() }}
        messages={[]}
        users={users}
        currentUserId="me"
      />
    );

    const more = screen.getByRole('button', { name: 'Más opciones' });
    fireEvent.click(more);
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0], { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(more);
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

  it('con canAddReactions muestra los 4 emojis rápidos y reaccionar en las herramientas del mensaje', () => {
    const onToggleReaction = vi.fn();
    render(
      <ChatView
        channel={channel}
        messages={MESSAGES}
        users={users}
        currentUserId="me"
        canAddReactions
        onToggleReaction={onToggleReaction}
      />
    );

    const firstMsg = screen.getByText('m!skip').closest('li')!;
    expect(within(firstMsg).getByRole('button', { name: 'Reaccionar con 👍' })).toBeTruthy();
    expect(within(firstMsg).getByRole('button', { name: 'Reaccionar con ❤️' })).toBeTruthy();
    expect(within(firstMsg).getByRole('button', { name: 'Reaccionar con 😂' })).toBeTruthy();
    expect(within(firstMsg).getByRole('button', { name: 'Reaccionar con 🔥' })).toBeTruthy();
    expect(within(firstMsg).getByRole('button', { name: '_reaccionar' })).toBeTruthy();

    fireEvent.click(within(firstMsg).getByRole('button', { name: 'Reaccionar con 🔥' }));
    expect(onToggleReaction).toHaveBeenCalledWith('m1', '🔥');
  });

  it('sin permiso canAddReactions no muestra emojis rápidos ni botón reaccionar', () => {
    const onToggleReaction = vi.fn();
    render(
      <ChatView
        channel={channel}
        messages={MESSAGES}
        users={users}
        currentUserId="me"
        canAddReactions={false}
        onToggleReaction={onToggleReaction}
      />
    );

    const firstMsg = screen.getByText('m!skip').closest('li')!;
    expect(within(firstMsg).queryByRole('button', { name: 'Reaccionar con 👍' })).toBeNull();
    expect(within(firstMsg).queryByRole('button', { name: 'Reaccionar con 🔥' })).toBeNull();
    expect(within(firstMsg).queryByRole('button', { name: '_reaccionar' })).toBeNull();
  });

  it('permite abrir el selector de emojis categorizado y seleccionar uno', () => {
    const onToggleReaction = vi.fn();
    render(
      <ChatView
        channel={channel}
        messages={MESSAGES}
        users={users}
        currentUserId="me"
        canAddReactions
        onToggleReaction={onToggleReaction}
      />
    );

    const firstMsg = screen.getByText('m!skip').closest('li')!;
    fireEvent.click(within(firstMsg).getByRole('button', { name: '_reaccionar' }));

    expect(screen.getByText('Frecuentes / Populares')).toBeTruthy();
    expect(screen.getByText('Caritas y Emociones')).toBeTruthy();
    expect(screen.getByText(/Próximamente: emojis personalizados/)).toBeTruthy();

    const popover = screen.getByRole('dialog', { name: 'Reacciones' });
    const emojiBtn = within(popover).getAllByRole('button', { name: '🚀' })[0];
    fireEvent.click(emojiBtn);
    expect(onToggleReaction).toHaveBeenCalledWith('m1', '🚀');
  });

  it('cierra el popover al hacer clic afuera', () => {
    render(
      <ChatView
        channel={channel}
        messages={MESSAGES}
        users={users}
        currentUserId="me"
        canAddReactions
      />
    );

    const firstMsg = screen.getByText('m!skip').closest('li')!;
    fireEvent.click(within(firstMsg).getByRole('button', { name: '_reaccionar' }));
    expect(screen.getByRole('dialog', { name: 'Reacciones' })).toBeTruthy();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog', { name: 'Reacciones' })).toBeNull();

    // También con el selector de emojis del composer
    fireEvent.click(screen.getByRole('button', { name: 'Emojis' }));
    expect(screen.getByRole('dialog', { name: 'Emojis' })).toBeTruthy();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog', { name: 'Emojis' })).toBeNull();
  });

  it('abrir un selector cierra cualquier otro popover abierto y el del composer se alinea a la derecha', () => {
    render(
      <ChatView
        channel={channel}
        messages={MESSAGES}
        users={users}
        currentUserId="me"
        canAddReactions
      />
    );

    const firstMsg = screen.getByText('m!skip').closest('li')!;
    fireEvent.click(within(firstMsg).getByRole('button', { name: '_reaccionar' }));
    expect(screen.getByRole('dialog', { name: 'Reacciones' })).toBeTruthy();

    // Al abrir el picker del composer, se cierra el de reacciones
    const smileBtn = screen.getByRole('button', { name: 'Emojis' });
    fireEvent.click(smileBtn);
    expect(screen.queryByRole('dialog', { name: 'Reacciones' })).toBeNull();
    const composerPopover = screen.getByRole('dialog', { name: 'Emojis' });
    expect(composerPopover).toBeTruthy();
    expect(composerPopover.className).toContain('composerEmojiPopover');

    // Al volver a abrir reacciones, se cierra el del composer
    fireEvent.click(within(firstMsg).getByRole('button', { name: '_reaccionar' }));
    expect(screen.queryByRole('dialog', { name: 'Emojis' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Reacciones' })).toBeTruthy();
  });

  it('muestra la barra de navegación de categorías y permite navegar directamente', () => {
    render(
      <ChatView
        channel={channel}
        messages={MESSAGES}
        users={users}
        currentUserId="me"
        canAddReactions
      />
    );

    const firstMsg = screen.getByText('m!skip').closest('li')!;
    fireEvent.click(within(firstMsg).getByRole('button', { name: '_reaccionar' }));

    const nav = screen.getByLabelText('Categorías de emojis');
    expect(nav).toBeTruthy();

    const catBtn = within(nav).getByRole('button', { name: 'Caritas y Emociones' });
    expect(catBtn).toBeTruthy();
    expect(catBtn.textContent).toBe('😀');

    fireEvent.click(catBtn);
    expect(screen.getByText('Caritas y Emociones')).toBeTruthy();
  });

  describe('aviso de que alguien se unió', () => {
    const join = (reactions: Message['reactions'] = []) =>
      msg('j1', 'u2', '', '2025-10-21T17:00:00', {
        type: 'system',
        system: { event: 'member_join', userId: 'u2' },
        reactions,
      });

    it('dice quién se unió con su nombre actual y saludar reacciona con 👋', () => {
      const onToggleReaction = vi.fn();
      render(<ChatView channel={channel} messages={[join()]} users={users} currentUserId="me" onToggleReaction={onToggleReaction} />);

      const row = document.querySelector('[data-message-id="j1"]')!;
      expect(row.textContent).toContain('se unió lbars, _saludalo');

      fireEvent.click(screen.getByRole('button', { name: 'Saludar a lbars' }));
      expect(onToggleReaction).toHaveBeenCalledWith('j1', '👋');
    });

    it('ya saludado dice "saludaste" y cuenta los saludos', () => {
      render(
        <ChatView
          channel={channel}
          messages={[join([{ emoji: '👋', count: 2, users: ['me', 'u3'] }])]}
          users={users}
          currentUserId="me"
        />
      );

      const row = document.querySelector('[data-message-id="j1"]')!;
      expect(row.textContent).toContain('saludaste');
      expect(row.textContent).toContain('👋 2');
      expect(screen.queryByRole('button', { name: 'Saludar a lbars' })).toBeNull();
    });

    it('quien se unió ve la bienvenida, no se saluda a sí mismo', () => {
      render(<ChatView channel={channel} messages={[join()]} users={users} currentUserId="u2" />);

      const row = document.querySelector('[data-message-id="j1"]')!;
      expect(row.textContent).toContain('te uniste al servidor. ¡te damos la bienvenida!');
      expect(screen.queryByRole('button', { name: /^Saludar/ })).toBeNull();
    });

    it('sin permiso de reaccionar, "saludalo" es texto', () => {
      render(<ChatView channel={channel} messages={[join()]} users={users} currentUserId="me" canAddReactions={false} />);

      expect(document.querySelector('[data-message-id="j1"]')!.textContent).toContain('se unió lbars, saludalo');
      expect(screen.queryByRole('button', { name: 'Saludar a lbars' })).toBeNull();
    });
  });
});

