import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getConversationWith } from '../../api/conversations';
import { acceptFriendRequest, sendFriendRequest } from '../../api/friends';
import type { Conversation, FriendRequest, Message, PublicProfile } from '../../types';
import type { InboxEvent, InboxSocketHandlers, InboxSocketStatus } from '../../realtime/inboxSocket';
import { conversationsQueryKey, conversationWithQueryKey } from '../inboxCache';
import { messagesQueryKey, type MessagePages } from '../messageCache';
import { useMarkChannelReadMutation } from '../useUnread';
import {
  friendsQueryKey,
  publicProfileQueryKey,
  useAcceptFriendRequestMutation,
  useSendFriendRequestMutation,
} from '../useFriends';
import { useInbox } from '../useInbox';
import { subscribeCallEvents } from '../../realtime/callEvents';

const connections: { handlers: InboxSocketHandlers; close: ReturnType<typeof vi.fn>; reconnect: ReturnType<typeof vi.fn> }[] = [];

vi.mock('../../realtime/inboxSocket', () => ({
  openInboxSocket: (handlers: InboxSocketHandlers) => {
    const connection = { handlers, close: vi.fn(), reconnect: vi.fn() };
    connections.push(connection);
    return connection;
  },
}));

const sessionStatus = { current: 'authenticated' };
vi.mock('../../auth/session', () => ({
  useSession: vi.fn().mockImplementation((selector) => selector({ status: sessionStatus.current })),
}));

vi.mock('../../api/conversations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/conversations')>()),
  getConversationWith: vi.fn().mockResolvedValue({ conversation: null, canMessage: true }),
}));

vi.mock('../../api/friends', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/friends')>()),
  acceptFriendRequest: vi.fn(),
  sendFriendRequest: vi.fn(),
}));

vi.mock('../../api/readStates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/readStates')>()),
  markChannelRead: vi.fn().mockResolvedValue(undefined),
}));

const conversation = (id: string, unreadCount = 0): Conversation => ({
  id,
  status: 'accepted',
  requestedBy: 'other',
  otherUserId: 'other',
  unreadCount,
  lastMessage: { content: 'vieja', authorId: 'other', createdAt: '2026-01-01T00:00:00.000Z' },
});

const incoming = (conversationId: string, id = 'm1'): InboxEvent => ({
  type: 'DM_MESSAGE',
  conversationId,
  message: { id, content: 'hola', authorId: 'other', channelId: conversationId, createdAt: '2026-05-01T00:00:00.000Z' },
});

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  return { queryClient, wrapper, invalidate };
}

const lastConnection = () => connections[connections.length - 1];
const emitStatus = (status: InboxSocketStatus) => act(() => lastConnection().handlers.onStatusChange?.(status));

describe('useInbox', () => {
  beforeEach(() => {
    connections.length = 0;
    sessionStatus.current = 'authenticated';
  });
  afterEach(() => vi.clearAllMocks());

  it('un mensaje entra al historial y a la lista de conversaciones', () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(conversationsQueryKey, [conversation('dm-1')]);
    queryClient.setQueryData<MessagePages>(messagesQueryKey('dm-1'), { pages: [[]], pageParams: [undefined] });
    renderHook(() => useInbox(), { wrapper });

    act(() => lastConnection().handlers.onEvent(incoming('dm-1')));

    const [updated] = queryClient.getQueryData<Conversation[]>(conversationsQueryKey) as Conversation[];
    expect(updated.unreadCount).toBe(1);
    expect(updated.lastMessage?.content).toBe('hola');
    const pages = queryClient.getQueryData<MessagePages>(messagesQueryKey('dm-1'));
    expect(pages?.pages[0].map((m: Message) => m.id)).toEqual(['m1']);
  });

  it('un mensaje que llega por los dos sockets no se repite', () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(conversationsQueryKey, [conversation('dm-1')]);
    queryClient.setQueryData<MessagePages>(messagesQueryKey('dm-1'), { pages: [[]], pageParams: [undefined] });
    renderHook(() => useInbox(), { wrapper });

    act(() => {
      lastConnection().handlers.onEvent(incoming('dm-1'));
      lastConnection().handlers.onEvent(incoming('dm-1'));
    });

    expect(queryClient.getQueryData<MessagePages>(messagesQueryKey('dm-1'))?.pages[0]).toHaveLength(1);
  });

  it('la conversación abierta no suma no leídos, y cambiarla no reconecta', () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(conversationsQueryKey, [conversation('dm-1')]);
    const { rerender } = renderHook(({ active }) => useInbox({ activeConversationId: active }), {
      wrapper,
      initialProps: { active: 'dm-2' },
    });

    rerender({ active: 'dm-1' });
    act(() => lastConnection().handlers.onEvent(incoming('dm-1')));

    expect(connections).toHaveLength(1);
    expect(queryClient.getQueryData<Conversation[]>(conversationsQueryKey)?.[0].unreadCount).toBe(0);
  });

  it('un mensaje de una conversación desconocida vuelve a pedir la lista', () => {
    const { queryClient, wrapper, invalidate } = setup();
    queryClient.setQueryData(conversationsQueryKey, [conversation('dm-1')]);
    renderHook(() => useInbox(), { wrapper });

    act(() => lastConnection().handlers.onEvent(incoming('dm-nueva')));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: conversationsQueryKey });
  });

  it('DM_CONVERSATION actualiza la lista y lo que se sabe de esa persona', () => {
    const { queryClient, wrapper, invalidate } = setup();
    queryClient.setQueryData(conversationsQueryKey, [{ ...conversation('dm-1'), status: 'pending' }]);
    renderHook(() => useInbox(), { wrapper });

    act(() => lastConnection().handlers.onEvent({ type: 'DM_CONVERSATION', conversation: conversation('dm-1') }));

    expect(queryClient.getQueryData<Conversation[]>(conversationsQueryKey)?.[0].status).toBe('accepted');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: conversationWithQueryKey('other') });
  });

  it('SERVER_UPDATED vuelve a pedir los servidores (nombre, ícono o banner cambiados por otro miembro)', () => {
    const { wrapper, invalidate } = setup();
    renderHook(() => useInbox(), { wrapper });

    act(() => lastConnection().handlers.onEvent({ type: 'SERVER_UPDATED', serverId: 'srv-1' }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['servers'] });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: conversationsQueryKey });
  });

  it('SERVER_DELETED vuelve a pedir los servidores e invoca onServerDeleted', () => {
    const { wrapper, invalidate } = setup();
    const onServerDeleted = vi.fn();
    renderHook(() => useInbox({ onServerDeleted }), { wrapper });

    act(() => lastConnection().handlers.onEvent({ type: 'SERVER_DELETED', serverId: 'srv-1' }));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['servers'] });
    expect(onServerDeleted).toHaveBeenCalledWith('srv-1');
  });

  it('los eventos de llamadas no tocan el caché: van a subscribeCallEvents', () => {
    const { queryClient, wrapper, invalidate } = setup();
    queryClient.setQueryData(conversationsQueryKey, [conversation('dm-1')]);
    const onEvent = vi.fn();
    const unsubscribe = subscribeCallEvents({ onEvent });
    renderHook(() => useInbox(), { wrapper });
    const event: InboxEvent = {
      type: 'CALL_RINGING',
      call: {
        id: 'c1',
        conversationId: 'dm-1',
        callerId: 'other',
        calleeId: 'me',
        status: 'ringing',
        createdAt: '2026-11-12T10:00:00.000Z',
        expiresAt: '2026-11-12T10:00:30.000Z',
      },
    };

    act(() => lastConnection().handlers.onEvent(event));

    expect(onEvent).toHaveBeenCalledWith(event);
    expect(invalidate).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(conversationsQueryKey)).toEqual([conversation('dm-1')]);
    unsubscribe();
  });

  it('avisa a las llamadas cuando el inbox vuelve, no la primera vez', () => {
    const { wrapper } = setup();
    const onReconnect = vi.fn();
    const unsubscribe = subscribeCallEvents({ onReconnect });
    renderHook(() => useInbox(), { wrapper });

    emitStatus('open');
    expect(onReconnect).not.toHaveBeenCalled();
    emitStatus('reconnecting');
    emitStatus('open');
    expect(onReconnect).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('DM_MESSAGE_REACTION_UPDATED actualiza las reacciones en el caché del historial', () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(conversationsQueryKey, [conversation('dm-1')]);
    queryClient.setQueryData<MessagePages>(messagesQueryKey('dm-1'), {
      pages: [[{ id: 'm1', content: 'hola', authorId: 'other', channelId: 'dm-1', timestamp: '2026-05-01T00:00:00.000Z', reactions: [] }]],
      pageParams: [undefined],
    });
    renderHook(() => useInbox(), { wrapper });

    act(() =>
      lastConnection().handlers.onEvent({
        type: 'DM_MESSAGE_REACTION_UPDATED',
        conversationId: 'dm-1',
        message: {
          id: 'm1',
          content: 'hola',
          authorId: 'other',
          channelId: 'dm-1',
          createdAt: '2026-05-01T00:00:00.000Z',
          reactions: [{ emoji: '❤️', count: 1, users: ['other'] }],
        },
      })
    );

    const pages = queryClient.getQueryData<MessagePages>(messagesQueryKey('dm-1'));
    expect(pages?.pages[0][0].reactions).toEqual([{ emoji: '❤️', count: 1, users: ['other'] }]);
  });

  it('solo pide las conversaciones de nuevo si la conexión volvió, no la primera vez', () => {
    const { wrapper, invalidate } = setup();
    renderHook(() => useInbox(), { wrapper });

    emitStatus('open');
    expect(invalidate).not.toHaveBeenCalled();

    emitStatus('reconnecting');
    emitStatus('open');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: conversationsQueryKey });
  });

  it('al volver la conexión refresca el historial de los DMs, no el de los canales', () => {
    const { queryClient, wrapper } = setup();
    const pages: MessagePages = { pages: [[]], pageParams: [undefined] };
    queryClient.setQueryData(messagesQueryKey('dm-1'), pages);
    queryClient.setQueryData(messagesQueryKey('channel-1'), pages);
    renderHook(() => useInbox(), { wrapper });

    emitStatus('open');
    emitStatus('reconnecting');
    emitStatus('open');

    expect(queryClient.getQueryState(messagesQueryKey('dm-1'))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(messagesQueryKey('channel-1'))?.isInvalidated).toBe(false);
  });

  it('con enabled en false suelta la conexión y al volver refresca', () => {
    const { wrapper, invalidate } = setup();
    const { rerender } = renderHook(({ enabled }) => useInbox({ enabled }), {
      wrapper,
      initialProps: { enabled: true },
    });
    emitStatus('open');

    rerender({ enabled: false });
    expect(lastConnection().close).toHaveBeenCalled();

    rerender({ enabled: true });
    expect(connections).toHaveLength(2);
    emitStatus('open');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: conversationsQueryKey });
  });

  it('sin sesión no conecta', () => {
    sessionStatus.current = 'unauthenticated';
    const { wrapper } = setup();

    renderHook(() => useInbox(), { wrapper });

    expect(connections).toHaveLength(0);
  });

  it('expone el estado y reconnect', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useInbox(), { wrapper });

    emitStatus('open');
    expect(result.current.isConnected).toBe(true);

    emitStatus('reconnecting');
    expect(result.current.isReconnecting).toBe(true);

    result.current.reconnect();
    expect(lastConnection().reconnect).toHaveBeenCalled();
  });
});

describe('useMarkChannelReadMutation con una conversación', () => {
  it('pone en cero sus no leídos', async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(conversationsQueryKey, [conversation('dm-1', 3), conversation('dm-2', 1)]);
    const { result } = renderHook(() => useMarkChannelReadMutation(), { wrapper });

    await act(() => result.current.mutateAsync({ channelId: 'dm-1' }));

    const counts = queryClient.getQueryData<Conversation[]>(conversationsQueryKey)?.map((c) => c.unreadCount);
    expect(counts).toEqual([0, 1]);
  });
});

describe('solicitudes de amistad', () => {
  const friend = { id: 'other', relationship: 'friend' } as PublicProfile;

  afterEach(() => vi.clearAllMocks());

  it('aceptar deja la conversación aceptada y refresca la relación', async () => {
    vi.mocked(acceptFriendRequest).mockResolvedValue(friend);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useAcceptFriendRequestMutation(), { wrapper });

    await act(() => result.current.mutateAsync('fr1'));

    expect(getConversationWith).toHaveBeenCalledWith('other');
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: friendsQueryKey }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: publicProfileQueryKey('other') });
  });

  it('si falla actualizar la conversación, igual quedan amigos', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(acceptFriendRequest).mockResolvedValue(friend);
    vi.mocked(getConversationWith).mockRejectedValueOnce(new Error('Chat caído'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useAcceptFriendRequestMutation(), { wrapper });

    await expect(act(() => result.current.mutateAsync('fr1'))).resolves.toBe(friend);
    consoleError.mockRestore();
  });

  it('con solicitud inversa quedan amigos y actualiza la conversación', async () => {
    vi.mocked(sendFriendRequest).mockResolvedValue({ id: 'fr1', user: friend } as FriendRequest);
    const { wrapper } = setup();
    const { result } = renderHook(() => useSendFriendRequestMutation(), { wrapper });

    await act(() => result.current.mutateAsync({ target: 'sofi' }));

    expect(getConversationWith).toHaveBeenCalledWith('other');
  });

  it('un 202 no toca la conversación', async () => {
    vi.mocked(sendFriendRequest).mockResolvedValue(null);
    const { wrapper } = setup();
    const { result } = renderHook(() => useSendFriendRequestMutation(), { wrapper });

    await expect(act(() => result.current.mutateAsync({ target: 'a@b.com' }))).resolves.toBeNull();
    expect(getConversationWith).not.toHaveBeenCalled();
  });
});
