import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { InboxEvent } from '../../realtime/inboxSocket';
import { createApiMock } from '../apiMock';
import { CURRENT_USER_ID } from '../data';

function setup(options: Parameters<typeof createApiMock>[0] = {}) {
  const mock = createApiMock(options);
  const events: InboxEvent[] = [];
  mock.subscribeInbox((event) => events.push(event));
  const types = () => events.map((e) => ('call' in e ? `${e.type}:${e.call.endReason ?? e.call.status}` : e.type));
  return { mock, events, types };
}

describe('mock de llamadas', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('u1 atiende a los 3 s y la llamada queda activa hasta que alguien corta', async () => {
    const { mock, types } = setup();

    const { call, token, permissions } = await mock.startCall('dm-u1');
    expect(call).toMatchObject({ callerId: CURRENT_USER_ID, calleeId: 'u1', status: 'ringing' });
    expect(token).toBeTruthy();
    expect(permissions).toEqual({ canSpeak: true, canVideo: false, canScreenShare: false });

    await vi.advanceTimersByTimeAsync(3_000);
    expect(await mock.getCurrentCall()).toMatchObject({ id: call.id, status: 'active' });

    await mock.endCall(call.id);
    await mock.endCall(call.id);
    expect(types()).toEqual(['CALL_RINGING:ringing', 'CALL_ACCEPTED:active', 'CALL_ENDED:ended']);
    expect(await mock.getCurrentCall()).toBeNull();
  });

  it('u2 rechaza; el resto no atiende y a los 30 s es missed', async () => {
    const { mock, types } = setup();

    await mock.startCall('dm-u2');
    await vi.advanceTimersByTimeAsync(3_000);
    expect(types()).toEqual(['CALL_RINGING:ringing', 'CALL_ENDED:declined']);

    const quiet = setup({ callAnswers: { u1: 'none' } });
    await quiet.mock.startCall('dm-u1');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(quiet.types()).toEqual(['CALL_RINGING:ringing', 'CALL_ENDED:missed']);
  });

  it('cortar mientras suena es canceled', async () => {
    const { mock, types } = setup();
    const { call } = await mock.startCall('dm-u1');

    await mock.endCall(call.id);

    expect(types()).toEqual(['CALL_RINGING:ringing', 'CALL_ENDED:canceled']);
  });

  it('rechaza como Voice: ocupado, sin aceptar, bloqueado, inexistente', async () => {
    const { mock } = setup({ callAnswers: { u1: 'busy' } });

    await expect(mock.startCall('dm-u1')).rejects.toMatchObject({ status: 409, code: 'CALL_BUSY' });
    await expect(mock.startCall('dm-u4')).rejects.toMatchObject({ status: 403, code: 'DM_PENDING' });
    await expect(mock.startCall('dm-u6')).rejects.toMatchObject({ status: 403, code: 'DM_NOT_DELIVERABLE' });
    await expect(mock.startCall('dm-nadie')).rejects.toMatchObject({ status: 404 });

    await mock.startCall('dm-u2');
    await expect(mock.startCall('dm-u2')).rejects.toMatchObject({ status: 409, code: 'CALL_BUSY' });
  });

  it('simula una llamada entrante que se atiende y el otro corta', async () => {
    const { mock, types } = setup();

    const call = mock.simulateIncomingCall('u1');
    expect(call).toMatchObject({ callerId: 'u1', calleeId: CURRENT_USER_ID });

    const { call: accepted } = await mock.acceptCall(call.id);
    expect(accepted.status).toBe('active');
    await expect(mock.acceptCall(call.id)).rejects.toMatchObject({ status: 409, code: 'CALL_NOT_RINGING' });

    mock.simulateRemoteHangUp();
    expect(types()).toEqual(['CALL_RINGING:ringing', 'CALL_ACCEPTED:active', 'CALL_ENDED:ended']);
  });

  it('una entrante se rechaza, o se pierde si quien llama corta', async () => {
    const { mock, types } = setup();

    await mock.declineCall(mock.simulateIncomingCall('u1').id);
    mock.simulateIncomingCall('u2');
    mock.simulateRemoteHangUp();

    expect(types()).toEqual(['CALL_RINGING:ringing', 'CALL_ENDED:declined', 'CALL_RINGING:ringing', 'CALL_ENDED:canceled']);
  });

  it('quien llama no puede atender ni rechazar su propia llamada', async () => {
    const { mock } = setup({ callAnswers: { u1: 'none' } });
    const { call } = await mock.startCall('dm-u1');

    await expect(mock.acceptCall(call.id)).rejects.toMatchObject({ status: 404 });
    await expect(mock.declineCall(call.id)).rejects.toMatchObject({ status: 404 });
  });
});
