import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { acceptCall, callRoomId, declineCall, endCall, getCurrentCall, startCall, type Call } from '../calls';
import { configureClient } from '../client';
import { ApiError } from '../errors';
import { setApiMock } from '../mock';

const CALL_ID = 'a/b c';
const ENCODED_ID = 'a%2Fb%20c';

const call: Call = {
  id: CALL_ID,
  conversationId: 'dm-1',
  callerId: 'u1',
  calleeId: 'u2',
  status: 'ringing',
  createdAt: '2026-11-12T10:00:00.000Z',
  expiresAt: '2026-11-12T10:00:30.000Z',
};
const joined = {
  call,
  token: 'lk',
  url: 'wss://livekit.test',
  permissions: { canSpeak: true, canVideo: false, canScreenShare: false },
};

function jsonResponse(body: unknown, status = 200, contentType = 'application/json') {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': contentType } });
}

describe('API de llamadas', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, 'fetch'>>;

  const respond = (body: unknown, status = 200, contentType?: string) =>
    fetchSpy.mockImplementation(async () => jsonResponse(body, status, contentType));
  const empty = () => fetchSpy.mockImplementation(async () => new Response(null, { status: 204 }));
  const lastCall = () => {
    const [url, init] = fetchSpy.mock.calls[fetchSpy.mock.calls.length - 1];
    return { url: String(url), method: init?.method, body: init?.body ? JSON.parse(String(init.body)) : undefined };
  };

  beforeEach(() => {
    configureClient({ baseUrl: 'http://api.test', getToken: async () => 'tok' });
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    setApiMock(null);
  });

  it('inicia con la conversación en el body', async () => {
    respond(joined, 201);

    expect(await startCall('dm-1')).toEqual(joined);
    expect(lastCall()).toMatchObject({
      url: 'http://api.test/api/v1/voice/calls',
      method: 'POST',
      body: { conversationId: 'dm-1' },
    });
  });

  it('accept, decline y end encodean el id', async () => {
    respond(joined);
    expect(await acceptCall(CALL_ID)).toEqual(joined);
    expect(lastCall()).toMatchObject({ url: `http://api.test/api/v1/voice/calls/${ENCODED_ID}/accept`, method: 'POST' });

    empty();
    await declineCall(CALL_ID);
    expect(lastCall().url).toBe(`http://api.test/api/v1/voice/calls/${ENCODED_ID}/decline`);

    await endCall(CALL_ID);
    expect(lastCall().url).toBe(`http://api.test/api/v1/voice/calls/${ENCODED_ID}/end`);
  });

  it('la llamada actual, o null', async () => {
    respond({ call });
    expect(await getCurrentCall()).toEqual(call);
    expect(lastCall()).toMatchObject({ url: 'http://api.test/api/v1/voice/calls/current', method: 'GET' });

    respond({ call: null });
    expect(await getCurrentCall()).toBeNull();
  });

  it('el ApiError trae el code de Problem Details', async () => {
    respond({ type: 'about:blank', title: 'Conflict', status: 409, code: 'CALL_BUSY' }, 409, 'application/problem+json');

    const error = await startCall('dm-1').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'CALL_BUSY' });
  });

  it('con el mock no va a la red', async () => {
    const mock = { startCall: vi.fn().mockResolvedValue(joined), getCurrentCall: vi.fn().mockResolvedValue(null) };
    setApiMock(mock as never);

    expect(await startCall('dm-1')).toBe(joined);
    expect(await getCurrentCall()).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('la sala de LiveKit es call-<id>', () => {
    expect(callRoomId('c1')).toBe('call-c1');
  });
});
