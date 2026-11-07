import { describe, it, expect, vi } from 'vitest';
import { ApiError } from '../../api/errors';
import { dmErrorCode } from '../../dm/errors';
import { buildDmList } from '../../dm/inboxList';
import { createApiMock } from '../apiMock';
import { USERS } from '../data';

describe('mock de DMs', () => {
  it('trae un caso de cada fila de la lista', async () => {
    const mock = createApiMock();

    const list = buildDmList(await mock.getConversations(), (await mock.getFriendRequests()).incoming);

    expect(new Set(list.map((item) => item.kind))).toEqual(
      new Set(['conversation', 'waiting_reply', 'message_request', 'friend_request'])
    );
  });

  it('el perfil nunca trae email', async () => {
    const profile = await createApiMock().getPublicProfile('u1');

    expect(USERS.u1.email).toBeDefined();
    expect(profile).not.toHaveProperty('email');
  });

  it('responde cada caso de la solicitud de amistad', async () => {
    const mock = createApiMock();

    expect(await mock.sendFriendRequest({ target: 'nadie@nada.com' })).toBeNull();
    await expect(mock.sendFriendRequest({ target: 'nadie' })).rejects.toMatchObject({ status: 404 });
    await expect(mock.sendFriendRequest({ target: USERS.u0.username })).rejects.toMatchObject({ status: 422 });
    await expect(mock.sendFriendRequest({ userId: 'u1' })).rejects.toMatchObject({ status: 409 });
    await expect(mock.sendFriendRequest({ userId: 'u4' })).rejects.toMatchObject({ status: 409 });
    expect(await mock.sendFriendRequest({ userId: 'u6' })).toBeNull();
  });

  it('una solicitud inversa los deja amigos', async () => {
    const mock = createApiMock();

    const request = await mock.sendFriendRequest({ userId: 'u5' });

    expect(request?.user.relationship).toBe('friend');
    expect((await mock.getFriendRequests()).incoming).toEqual([]);
  });

  it('aceptar una solicitud de amistad acepta la conversación pendiente', async () => {
    const mock = createApiMock();
    const { conversation } = await mock.startConversation({ recipientId: 'u5', content: 'hola' });
    expect(conversation.status).toBe('pending');

    await mock.acceptFriendRequest('fr-u5');

    expect((await mock.getPublicProfile('u5')).relationship).toBe('friend');
    expect((await mock.getConversationWith('u5')).conversation?.status).toBe('accepted');
  });

  it('bloquear borra amistad y solicitudes, y conserva el historial', async () => {
    const mock = createApiMock();

    await mock.blockUser('u1');

    expect((await mock.getPublicProfile('u1')).relationship).toBe('blocked');
    expect((await mock.getFriends()).map((f) => f.id)).not.toContain('u1');
    expect(await mock.getMessages('dm-u1')).not.toEqual([]);
    expect(dmErrorCode(await mock.sendMessage('dm-u1', 'hola').catch((e) => e))).toBe('DM_NOT_DELIVERABLE');

    await mock.unblockUser('u1');
    await expect(mock.sendMessage('dm-u1', 'hola')).resolves.toMatchObject({ content: 'hola' });
  });

  it('quien te bloqueó figura sin relación y da un error genérico', async () => {
    const mock = createApiMock({ blockedBy: ['u1'] });

    expect(await mock.getConversationWith('u1')).toMatchObject({ canMessage: false });
    const error = await mock.startConversation({ recipientId: 'u1', content: 'hola' }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(dmErrorCode(error)).toBe('DM_NOT_DELIVERABLE');
  });

  it('el primer mensaje a un no amigo crea una conversación pendiente y no deja mandar otro', async () => {
    const mock = createApiMock();

    const { conversation } = await mock.startConversation({ recipientId: 'u5', content: 'hola' });

    expect(conversation.status).toBe('pending');
    expect(dmErrorCode(await mock.sendMessage(conversation.id, 'otro').catch((e) => e))).toBe('DM_PENDING');
  });

  it('rechazar la saca de la lista de quien rechazó', async () => {
    const mock = createApiMock();

    await mock.declineConversation('dm-u3');

    expect((await mock.getConversations()).map((c) => c.id)).not.toContain('dm-u3');
  });

  it('aceptar el mensaje libera la conversación sin hacerlos amigos', async () => {
    const mock = createApiMock();

    await mock.acceptConversation('dm-u3');

    await expect(mock.sendMessage('dm-u3', 'dale')).resolves.toBeDefined();
    expect((await mock.getPublicProfile('u3')).relationship).toBe('none');
  });

  it('lo que llega se ve en el inbox y suma no leídos hasta marcarlo', async () => {
    const mock = createApiMock();
    const onEvent = vi.fn();
    const unsubscribe = mock.subscribeInbox(onEvent);

    mock.simulateIncomingMessage('u2', 'che');

    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'DM_MESSAGE', conversationId: 'dm-u2' }));
    const unread = async () => (await mock.getConversations()).find((c) => c.id === 'dm-u2')?.unreadCount;
    expect(await unread()).toBe(1);

    await mock.markChannelRead('dm-u2');
    expect(await unread()).toBe(0);

    unsubscribe();
    mock.simulateIncomingMessage('u2', 'otro');
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('cada instancia arranca con su propio estado', async () => {
    await createApiMock().blockUser('u1');

    expect((await createApiMock().getPublicProfile('u1')).relationship).toBe('friend');
  });
});
