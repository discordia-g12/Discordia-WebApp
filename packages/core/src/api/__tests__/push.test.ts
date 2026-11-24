import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { getVapidPublicKey, parsePushData, pushDataToDestination, unregisterPushDevice } from '../push';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const data = {
  notificationId: 'n1',
  reason: 'mention',
  serverId: 's1',
  channelId: 'c1',
  threadId: null,
  messageId: 'm1',
};

describe('API de push', () => {
  beforeEach(() => configureClient({ baseUrl: 'http://api.test', getToken: async () => 't' }));
  afterEach(() => vi.restoreAllMocks());

  it('borrar un dispositivo manda el token en el cuerpo del DELETE', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    await unregisterPushDevice('ExponentPushToken[abc]');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://api.test/api/v1/notifications/push/devices');
    expect(init?.method).toBe('DELETE');
    expect(JSON.parse(init?.body as string)).toEqual({ token: 'ExponentPushToken[abc]' });
  });

  it('la clave VAPID vacía o null es push web apagado', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    fetch.mockResolvedValueOnce(jsonResponse({ publicKey: 'BKey' }));
    expect(await getVapidPublicKey()).toBe('BKey');
    fetch.mockResolvedValueOnce(jsonResponse({ publicKey: null }));
    expect(await getVapidPublicKey()).toBeNull();
    fetch.mockResolvedValueOnce(jsonResponse({ publicKey: '' }));
    expect(await getVapidPublicKey()).toBeNull();
  });
});

describe('parsePushData', () => {
  it('acepta el data del contrato', () => {
    expect(parsePushData(data)).toEqual(data);
  });

  it('rechaza lo que no tiene la forma del contrato', () => {
    expect(parsePushData(null)).toBeNull();
    expect(parsePushData('x')).toBeNull();
    expect(parsePushData({ ...data, reason: 'otra' })).toBeNull();
    expect(parsePushData({ ...data, channelId: undefined })).toBeNull();
    expect(parsePushData({ ...data, serverId: 3 })).toBeNull();
  });
});

describe('pushDataToDestination', () => {
  it('un canal de servidor va al canal, con el hilo si lo hay', () => {
    expect(pushDataToDestination({ ...data, threadId: 't1' }, undefined)).toEqual({
      kind: 'channel',
      serverId: 's1',
      channelId: 'c1',
      threadId: 't1',
      messageId: 'm1',
    });
  });

  it('un DM se abre por el otro participante de la conversación', () => {
    const dm = { ...data, reason: 'dm', serverId: null, channelId: 'dm-abc' };
    const conversations = [
      { id: 'dm-zzz', otherUserId: 'u9' },
      { id: 'dm-abc', otherUserId: 'u2' },
    ];
    expect(pushDataToDestination(dm, conversations)).toEqual({
      kind: 'dm',
      userId: 'u2',
      channelId: 'dm-abc',
      threadId: null,
      messageId: 'm1',
    });
  });

  it('null si el DM no está en las conversaciones o el data no es válido', () => {
    const dm = { ...data, reason: 'dm', serverId: null, channelId: 'dm-abc' };
    expect(pushDataToDestination(dm, [])).toBeNull();
    expect(pushDataToDestination(dm, undefined)).toBeNull();
    expect(pushDataToDestination({ foo: 1 }, [])).toBeNull();
  });
});
