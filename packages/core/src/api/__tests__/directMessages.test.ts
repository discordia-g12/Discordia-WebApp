import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { blockUser, getBlocks, unblockUser } from '../blocks';
import { configureClient } from '../client';
import {
  acceptConversation,
  declineConversation,
  getConversations,
  getConversationWith,
  isConversationId,
  startConversation,
} from '../conversations';
import { ApiError, parseErrorResponse } from '../errors';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  sendFriendRequest,
} from '../friends';
import { getPresence } from '../presence';
import { getMutualServers } from '../servers';
import { getPublicProfile, isProfileUnavailable } from '../users';

const AUTH0_ID = 'auth0|abc';
const ENCODED_ID = 'auth0%7Cabc';

const rawProfile = {
  user_id: AUTH0_ID,
  username: 'sofi',
  display_name: 'Sofía',
  avatar_url: null,
  bio: 'hola',
  custom_status: null,
  created_at: '2026-01-01T00:00:00Z',
  relationship: 'request_received',
  friend_request_id: 'fr1',
};

const profile = {
  id: AUTH0_ID,
  username: 'sofi',
  displayName: 'Sofía',
  avatarUrl: null,
  bio: 'hola',
  customStatus: null,
  createdAt: '2026-01-01T00:00:00Z',
  relationship: 'request_received',
  friendRequestId: 'fr1',
};

const rawRequest = { id: 'fr1', user: rawProfile, message: 'dale', created_at: '2026-02-01T00:00:00Z' };
const request = { id: 'fr1', user: profile, message: 'dale', createdAt: '2026-02-01T00:00:00Z' };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('API de DMs', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>;

  const respond = (body: unknown, status = 200) => fetchSpy.mockImplementation(async () => jsonResponse(body, status));
  const empty = () => fetchSpy.mockImplementation(async () => new Response(null, { status: 204 }));
  const lastCall = () => {
    const [url, init] = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
    return { url: String(url), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined };
  };

  beforeEach(() => {
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'tok' });
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => vi.restoreAllMocks());

  describe('perfil público', () => {
    it('encodea el id y pasa a camelCase', async () => {
      respond(rawProfile);

      expect(await getPublicProfile(AUTH0_ID)).toEqual(profile);
      expect(lastCall().url).toBe(`http://api.test/api/v1/users/${ENCODED_ID}/profile`);
    });

    it('usa el username si no hay nombre visible y no inventa friendRequestId', async () => {
      respond({ ...rawProfile, display_name: null, friend_request_id: null });

      const result = await getPublicProfile(AUTH0_ID);

      expect(result.displayName).toBe('sofi');
      expect(result).not.toHaveProperty('friendRequestId');
    });

    it('un 404 es "perfil no disponible"', async () => {
      respond({ detail: 'not found' }, 404);

      const error = await getPublicProfile(AUTH0_ID).catch((e) => e);

      expect(isProfileUnavailable(error)).toBe(true);
      expect(isProfileUnavailable(new ApiError({ status: 500 }))).toBe(false);
    });
  });

  it('pide los servidores en común con el id encodeado', async () => {
    respond([{ id: 's1', name: 'FIUBA', icon_url: 'http://x/i.png' }, { id: 's2', name: 'Otro', icon_url: null }]);

    expect(await getMutualServers(AUTH0_ID)).toEqual([
      { id: 's1', name: 'FIUBA', iconUrl: 'http://x/i.png' },
      { id: 's2', name: 'Otro' },
    ]);
    expect(lastCall().url).toBe(`http://api.test/api/v1/servers/mutual/${ENCODED_ID}`);
  });

  describe('amigos', () => {
    it('lista amigos', async () => {
      respond([rawProfile]);

      expect(await getFriends()).toEqual([profile]);
      expect(lastCall().url).toBe('http://api.test/api/v1/users/me/friends');
    });

    it('borra un amigo con el id encodeado', async () => {
      empty();

      await removeFriend(AUTH0_ID);

      expect(lastCall()).toMatchObject({ method: 'DELETE', url: `http://api.test/api/v1/users/me/friends/${ENCODED_ID}` });
    });

    it('lista las solicitudes recibidas y enviadas', async () => {
      respond({ incoming: [rawRequest], outgoing: [] });

      expect(await getFriendRequests()).toEqual({ incoming: [request], outgoing: [] });
    });

    it('pide amistad por username con descripción', async () => {
      respond(rawRequest, 201);

      expect(await sendFriendRequest({ target: 'sofi', message: 'dale' })).toEqual(request);
      expect(lastCall()).toMatchObject({
        method: 'POST',
        url: 'http://api.test/api/v1/users/me/friend-requests',
        body: { target: 'sofi', message: 'dale' },
      });
    });

    it('pide amistad por user_id, en snake_case', async () => {
      respond(rawRequest, 201);

      await sendFriendRequest({ userId: AUTH0_ID });

      expect(lastCall().body).toEqual({ user_id: AUTH0_ID });
    });

    it('un 202 resuelve en null, sin confirmar nada', async () => {
      respond({ status: 'sent' }, 202);

      expect(await sendFriendRequest({ target: 'a@b.com' })).toBeNull();
    });

    it('acepta y devuelve el amigo', async () => {
      respond({ friend: rawProfile });

      expect(await acceptFriendRequest('fr1')).toEqual(profile);
      expect(lastCall()).toMatchObject({ method: 'POST', url: 'http://api.test/api/v1/users/me/friend-requests/fr1/accept' });
    });

    it('rechaza y cancela', async () => {
      empty();

      await declineFriendRequest('fr1');
      expect(lastCall()).toMatchObject({ method: 'POST', url: 'http://api.test/api/v1/users/me/friend-requests/fr1/decline' });

      await cancelFriendRequest('fr1');
      expect(lastCall()).toMatchObject({ method: 'DELETE', url: 'http://api.test/api/v1/users/me/friend-requests/fr1' });
    });
  });

  describe('bloqueos', () => {
    it('lista, bloquea y desbloquea', async () => {
      respond([rawProfile]);
      expect(await getBlocks()).toEqual([profile]);

      empty();
      await blockUser(AUTH0_ID);
      expect(lastCall()).toMatchObject({ method: 'PUT', url: `http://api.test/api/v1/users/me/blocks/${ENCODED_ID}` });

      await unblockUser(AUTH0_ID);
      expect(lastCall()).toMatchObject({ method: 'DELETE', url: `http://api.test/api/v1/users/me/blocks/${ENCODED_ID}` });
    });
  });

  describe('conversaciones', () => {
    const conversation = { id: 'dm-1', status: 'pending', requestedBy: 'a', otherUserId: 'b', unreadCount: 0 };

    it('reconoce los ids de conversación', () => {
      expect(isConversationId('dm-507f1f77')).toBe(true);
      expect(isConversationId('507f1f77')).toBe(false);
      expect(isConversationId(null)).toBe(false);
    });

    it('lista las conversaciones', async () => {
      respond([conversation]);

      expect(await getConversations()).toEqual([conversation]);
      expect(lastCall().url).toBe('http://api.test/api/v1/chat/conversations');
    });

    it('consulta con PUT y el id encodeado', async () => {
      respond({ conversation: null, canMessage: true });

      expect(await getConversationWith(AUTH0_ID)).toEqual({ conversation: null, canMessage: true });
      expect(lastCall()).toMatchObject({ method: 'PUT', url: `http://api.test/api/v1/chat/conversations/with/${ENCODED_ID}` });
    });

    it('el primer mensaje normaliza el mensaje que vuelve', async () => {
      respond({ conversation, message: { id: 'm1', content: 'hola', createdAt: '2026-01-01T00:00:00Z' } }, 201);

      const result = await startConversation({ recipientId: AUTH0_ID, content: 'hola' });

      expect(result.message.timestamp).toBe('2026-01-01T00:00:00Z');
      expect(lastCall().body).toEqual({ recipientId: AUTH0_ID, content: 'hola' });
    });

    it('acepta y rechaza', async () => {
      respond({ ...conversation, status: 'accepted' });
      expect((await acceptConversation('dm-1')).status).toBe('accepted');
      expect(lastCall().url).toBe('http://api.test/api/v1/chat/conversations/dm-1/accept');

      empty();
      await declineConversation('dm-1');
      expect(lastCall().url).toBe('http://api.test/api/v1/chat/conversations/dm-1/decline');
    });
  });

  describe('presencia', () => {
    it('no pide nada sin ids', async () => {
      expect(await getPresence([])).toEqual({});
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sin repetidos y en lotes de 100', async () => {
      fetchSpy.mockImplementation(async (_url, init) => {
        const { userIds } = JSON.parse(String(init?.body)) as { userIds: string[] };
        return jsonResponse(Object.fromEntries(userIds.map((id) => [id, 'online'])));
      });
      const ids = Array.from({ length: 150 }, (_, i) => `u${i}`);

      const result = await getPresence([...ids, 'u0']);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(Object.keys(result)).toHaveLength(150);
      expect(lastCall().url).toBe('http://api.test/api/v1/chat/presence');
    });
  });

  it('un error conserva su code', async () => {
    const response = jsonResponse({ title: 'Forbidden', status: 403, code: 'DM_PENDING' }, 403);

    expect((await parseErrorResponse(response)).code).toBe('DM_PENDING');
  });
});
