import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import type { AppNotification } from '@discordia/core';
import { useUIStore } from '../../../app/uiStore';
import { ChatView, type ThreadViewOptions } from '../ChatView';
import { openNotification } from '../../notifications/notificationActions';
import { a11yViolations } from '../../../testing/axe';
import type { Channel, Message, User } from '../../../types';

const users: Record<string, User> = {
  me: { id: 'me', username: 'mar', displayName: 'Mar', status: 'online' } as User,
  u2: { id: 'u2', username: 'ana', displayName: 'Ana', status: 'online' } as User,
};
const channel = { id: 'c1', name: 'general', type: 'text' } as Channel;
const msg = (id: string, authorId: string, content: string, extra: Partial<Message> = {}) =>
  ({ id, authorId, content, timestamp: '2026-11-23T10:00:00Z', channelId: 'c1', ...extra }) as Message;
const thread = (replyCount: number) => ({
  replyCount,
  lastReplyAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  lastReplyId: 'r1',
  participantIds: ['u2', 'me'],
});

describe('hilos en el canal (CA1, CA3)', () => {
  it('"responder en hilo" abre el hilo del mensaje; no aparece en avisos del sistema', () => {
    const onOpenThread = vi.fn();
    render(
      <ChatView
        channel={channel}
        messages={[msg('m1', 'u2', 'tema'), msg('s1', 'u2', '', { type: 'system' })]}
        users={users}
        currentUserId="me"
        onOpenThread={onOpenThread}
      />
    );

    const actions = screen.getAllByRole('button', { name: '_responder en hilo' });
    expect(actions).toHaveLength(1);
    fireEvent.click(actions[0]);
    expect(onOpenThread).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
  });

  it('un mensaje con respuestas muestra cuántas y cuándo fue la última, y abre el hilo', () => {
    const onOpenThread = vi.fn();
    render(
      <ChatView
        channel={channel}
        messages={[msg('m1', 'u2', 'tema', { thread: thread(3) }), msg('m2', 'me', 'otro')]}
        users={users}
        currentUserId="me"
        onOpenThread={onOpenThread}
      />
    );

    const summary = screen.getByRole('button', { name: /Abrir hilo: 3 respuestas · última hace 5 min/ });
    fireEvent.click(summary);
    expect(onOpenThread).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
    // Uno sin respuestas no muestra resumen
    expect(screen.getAllByRole('button', { name: /Abrir hilo/ })).toHaveLength(1);
  });

  it('las fotos del resumen son solo de quienes respondieron, no del autor del original', () => {
    render(
      <ChatView
        channel={channel}
        messages={[msg('m1', 'u2', 'tema', { thread: { ...thread(1), replierIds: ['me'] } })]}
        users={users}
        currentUserId="me"
        onOpenThread={vi.fn()}
      />
    );
    const summary = screen.getByRole('button', { name: /Abrir hilo/ });
    const avatars = within(summary).getAllByRole('img', { hidden: true }).map((img) => img.getAttribute('aria-label'));
    expect(avatars).toEqual(['Mar']);
  });

  it('un original borrado con respuestas sigue mostrando el resumen', () => {
    render(
      <ChatView
        channel={channel}
        messages={[msg('m1', 'u2', '', { type: 'deleted', thread: thread(1) })]}
        users={users}
        currentUserId="me"
        onOpenThread={vi.fn()}
      />
    );
    expect(screen.getByText('/ este mensaje fue eliminado')).toBeTruthy();
    expect(screen.getByRole('button', { name: /1 respuesta · última/ })).toBeTruthy();
  });

  it('sin onOpenThread (p. ej. una solicitud de mensaje) no hay hilos', () => {
    render(<ChatView channel={channel} messages={[msg('m1', 'u2', 'tema', { thread: thread(2) })]} users={users} currentUserId="me" />);
    expect(screen.queryByRole('button', { name: '_responder en hilo' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Abrir hilo/ })).toBeNull();
  });
});

describe('vista de hilo (CA2, CA4)', () => {
  const options = (extra: Partial<ThreadViewOptions> = {}): ThreadViewOptions => ({
    parent: msg('p', 'u2', 'el mensaje original', { thread: thread(2) }),
    locationLabel: '•general',
    onClose: vi.fn(),
    muted: false,
    onToggleMute: vi.fn(),
    hasMore: false,
    isLoadingMore: false,
    onLoadMore: vi.fn(),
    ...extra,
  });

  const renderThread = (extra: Partial<ThreadViewOptions> = {}, onSendMessage = vi.fn()) => {
    const view = options(extra);
    // En la app el hilo va dentro del <aside> de ThreadPanel (una región)
    render(
      <aside aria-label="Hilo">
      <ChatView
        channel={channel}
        thread={view}
        messages={[msg('r1', 'me', 'primera respuesta', { threadParentId: 'p' }), msg('r2', 'u2', 'segunda', { threadParentId: 'p' })]}
        users={users}
        currentUserId="me"
        onSendMessage={onSendMessage}
        onOpenThread={vi.fn()}
      />
      </aside>
    );
    return view;
  };

  it('muestra el original arriba como contexto, el contador y las respuestas', () => {
    renderThread();

    expect(screen.getByRole('heading', { name: 'Hilo' })).toBeTruthy();
    expect(screen.getByText('en •general')).toBeTruthy();
    const original = screen.getByRole('list', { name: 'Mensaje original' });
    expect(within(original).getByText('el mensaje original')).toBeTruthy();
    expect(within(original).getByText('2 respuestas')).toBeTruthy();
    expect(screen.getByText('primera respuesta')).toBeTruthy();
    // Dentro del hilo no se abre otro hilo
    expect(screen.queryByRole('button', { name: '_responder en hilo' })).toBeNull();
    // Ni los botones del canal
    expect(screen.queryByRole('button', { name: 'Mensajes fijados' })).toBeNull();
  });

  it('enviar desde la barra del hilo llama a onSendMessage', () => {
    const onSendMessage = vi.fn();
    renderThread({}, onSendMessage);

    const input = screen.getByRole('combobox', { name: 'Responder en el hilo' });
    fireEvent.change(input, { target: { value: 'mi respuesta' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSendMessage).toHaveBeenCalledWith('mi respuesta', undefined, undefined);
  });

  it('tocar la cita de una respuesta lleva al mensaje citado, también al original de arriba', () => {
    render(
      <ChatView
        channel={channel}
        thread={options()}
        messages={[
          msg('r1', 'me', 'primera respuesta', { threadParentId: 'p' }),
          msg('r2', 'u2', 'al original', { threadParentId: 'p', replyTo: { id: 'p', authorId: 'u2', content: 'el mensaje original' } }),
          msg('r3', 'u2', 'a la primera', { threadParentId: 'p', replyTo: { id: 'r1', authorId: 'me', content: 'primera respuesta' } }),
        ]}
        users={users}
        currentUserId="me"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Ir al mensaje citado: @Ana/ }));
    expect(document.querySelector('[data-message-id="p"]')!.className).toContain('highlighted');
    fireEvent.click(screen.getByRole('button', { name: /Ir al mensaje citado: @Mar/ }));
    expect(document.querySelector('[data-message-id="r1"]')!.className).toContain('highlighted');
  });

  it('cerrar, silenciar y cargar más respuestas', () => {
    const view = renderThread({ hasMore: true, muted: true });

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar hilo' }));
    expect(view.onClose).toHaveBeenCalled();

    const mute = screen.getByRole('button', { name: 'Reactivar avisos del hilo' });
    expect(mute.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(mute);
    expect(view.onToggleMute).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '_cargar más respuestas' }));
    expect(view.onLoadMore).toHaveBeenCalled();
  });

  it('no tiene problemas de accesibilidad', async () => {
    renderThread();
    expect(await a11yViolations()).toEqual([]);
  });
});

describe('estado del hilo abierto', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedServerId: 's1', selectedChannelId: 'c1', openThread: null, isMemberListOpen: true, isMemberOverlayOpen: false });
  });

  it('cambiar de canal cierra el hilo; el mismo canal no', () => {
    const ui = useUIStore.getState();
    ui.setOpenThread({ channelId: 'c1', messageId: 'p', serverId: 's1' });
    useUIStore.getState().setSelectedChannelId('c1');
    expect(useUIStore.getState().openThread?.messageId).toBe('p');
    useUIStore.getState().setSelectedChannelId('c2');
    expect(useUIStore.getState().openThread).toBeNull();
  });

  it('abrir la lista de miembros cierra el hilo y muestra la lista', () => {
    useUIStore.setState({ isMemberListOpen: false });
    useUIStore.getState().setOpenThread({ channelId: 'c1', messageId: 'p', serverId: 's1' });
    useUIStore.getState().toggleMemberList();
    expect(useUIStore.getState().openThread).toBeNull();
    expect(useUIStore.getState().isMemberListOpen).toBe(true);
  });

  it('escritorio compacto: la lista encima del chat tiene su propio estado y abrirla cierra el hilo', () => {
    useUIStore.setState({ isMemberOverlayOpen: false });
    useUIStore.getState().toggleMemberList(true);
    expect(useUIStore.getState().isMemberOverlayOpen).toBe(true);
    // La de pantalla grande no cambia
    expect(useUIStore.getState().isMemberListOpen).toBe(true);

    useUIStore.getState().setOpenThread({ channelId: 'c1', messageId: 'p', serverId: 's1' });
    useUIStore.getState().toggleMemberList(true);
    expect(useUIStore.getState().openThread).toBeNull();
    expect(useUIStore.getState().isMemberOverlayOpen).toBe(true);

    useUIStore.getState().closeMemberOverlay();
    expect(useUIStore.getState().isMemberOverlayOpen).toBe(false);
  });

  it('escritorio compacto: cambiar de canal o de servidor cierra la lista encima del chat', () => {
    useUIStore.setState({ isMemberOverlayOpen: true });
    useUIStore.getState().setSelectedChannelId('c1');
    expect(useUIStore.getState().isMemberOverlayOpen).toBe(true);
    useUIStore.getState().setSelectedChannelId('c2');
    expect(useUIStore.getState().isMemberOverlayOpen).toBe(false);

    useUIStore.setState({ isMemberOverlayOpen: true });
    useUIStore.getState().setSelectedServerId('s2');
    expect(useUIStore.getState().isMemberOverlayOpen).toBe(false);
  });

  it('abrir un aviso de hilo de un servidor lleva al canal y abre el hilo', () => {
    const notification: AppNotification = {
      id: 'n1',
      reason: 'thread_reply',
      serverId: 's2',
      channelId: 'c9',
      threadId: 'p9',
      messageId: 'r9',
      actorId: 'u2',
      preview: 'hola',
      createdAt: '',
      readAt: null,
    };
    openNotification(notification);
    const ui = useUIStore.getState();
    expect(ui.selectedServerId).toBe('s2');
    expect(ui.selectedChannelId).toBe('c9');
    expect(ui.openThread).toEqual({ channelId: 'c9', messageId: 'p9', serverId: 's2' });
  });

  it('un aviso de un DM lleva al chat con quien escribió', () => {
    openNotification({
      id: 'n2',
      reason: 'thread_reply',
      serverId: null,
      channelId: 'dm-1',
      threadId: 'p1',
      messageId: 'r1',
      actorId: 'u2',
      preview: '',
      createdAt: '',
      readAt: null,
    });
    const ui = useUIStore.getState();
    expect(ui.selectedServerId).toBe('home');
    expect(ui.selectedDm).toEqual({ type: 'chat', userId: 'u2' });
    expect(ui.openThread).toEqual({ channelId: 'dm-1', messageId: 'p1', serverId: null });
  });
});
