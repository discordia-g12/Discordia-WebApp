import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { acceptCall, declineCall, endCall, getCurrentCall, startCall, type Call, type CallJoinResponse } from '../../api/calls';
import { getConversations } from '../../api/conversations';
import { ApiError } from '../../api/errors';
import { setApiMock } from '../../api/mock';
import { CALL_LOCAL_TIMEOUT_GRACE_MS } from '../../calls/machine';
import { publishCallEvent, publishInboxReconnect } from '../../realtime/callEvents';
import type { CallInboxEvent } from '../../realtime/inboxSocket';
import type { Conversation } from '../../types';
import { conversationsQueryKey } from '../inboxCache';
import { CALL_ROOM_CLOSED_GRACE_MS, usePrivateCall, type PrivateCallRoom } from '../usePrivateCall';
import type { VoiceJoinOptions } from '../useVoiceRoom';

vi.mock('../../api/calls', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/calls')>()),
  startCall: vi.fn(),
  acceptCall: vi.fn(),
  declineCall: vi.fn(),
  endCall: vi.fn(),
  getCurrentCall: vi.fn(),
}));

vi.mock('../../api/conversations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/conversations')>()),
  getConversations: vi.fn(),
}));

const sessionStatus = { current: 'authenticated' };
vi.mock('../../auth/session', () => ({
  useSession: vi.fn().mockImplementation((selector) => selector({ status: sessionStatus.current })),
}));

// El usuario es "me"; su id canónico puede ser otro: el rol sale de otherUserId
const OTHER = 'other';

const conversation: Conversation = {
  id: 'dm-1',
  status: 'accepted',
  requestedBy: OTHER,
  otherUserId: OTHER,
  unreadCount: 0,
};

const makeCall = (overrides: Partial<Call> = {}): Call => ({
  id: 'c1',
  conversationId: 'dm-1',
  callerId: 'me-canonical',
  calleeId: OTHER,
  status: 'ringing',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30_000).toISOString(),
  ...overrides,
});
const incomingCall = (overrides: Partial<Call> = {}) => makeCall({ callerId: OTHER, calleeId: 'me-canonical', ...overrides });

const joinResponse = (call: Call): CallJoinResponse => ({
  call,
  token: 'call-token',
  url: 'wss://livekit.test',
  permissions: { canSpeak: true, canVideo: false, canScreenShare: false },
});

function fakeRoom() {
  return {
    join: vi.fn(async (_roomId: string, _opts?: VoiceJoinOptions) => ({ microphoneAvailable: true })),
    leave: vi.fn(async () => undefined),
  } satisfies PrivateCallRoom;
}

function setup({ cached = true, enabled = true } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (cached) queryClient.setQueryData(conversationsQueryKey, [conversation]);
  const room = fakeRoom();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(({ enabled: on }) => usePrivateCall({ room, enabled: on }), {
    wrapper,
    initialProps: { enabled },
  });
  return { ...hook, room, queryClient };
}

/** Lo que useVoiceRoom recibió como opciones de la sala de la llamada. */
const joinOptions = (room: ReturnType<typeof fakeRoom>) => room.join.mock.calls[room.join.mock.calls.length - 1][1]!;

const inbox = async (event: CallInboxEvent) => {
  await act(async () => {
    publishCallEvent(event);
  });
};

describe('usePrivateCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStatus.current = 'authenticated';
    vi.mocked(getCurrentCall).mockResolvedValue(null);
    vi.mocked(endCall).mockResolvedValue(undefined);
    vi.mocked(declineCall).mockResolvedValue(undefined);
    vi.mocked(getConversations).mockResolvedValue([conversation]);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    setApiMock(null);
    vi.restoreAllMocks();
  });

  describe('quien llama', () => {
    it('inicia, entra a la sala call-<id> con las credenciales de Voice, atienden y corta el otro', async () => {
      const call = makeCall();
      vi.mocked(startCall).mockResolvedValue(joinResponse(call));
      const { result, room } = setup();

      await act(async () => {
        await result.current.start('dm-1');
      });

      expect(startCall).toHaveBeenCalledWith('dm-1');
      expect(result.current.state).toMatchObject({ status: 'outgoing', role: 'caller', call: { id: 'c1' } });
      expect(room.join).toHaveBeenCalledWith('call-c1', expect.objectContaining({ credentials: expect.any(Function) }));
      expect(await joinOptions(room).credentials!()).toEqual({
        token: 'call-token',
        url: 'wss://livekit.test',
        permissions: { canSpeak: true, canVideo: false, canScreenShare: false },
      });

      await inbox({ type: 'CALL_ACCEPTED', call: { ...call, status: 'active' } });
      expect(result.current.state.status).toBe('active');

      await inbox({ type: 'CALL_ENDED', call: { ...call, status: 'ended', endReason: 'ended' } });
      expect(result.current.state).toMatchObject({ status: 'ended', reason: 'ended', role: 'caller' });
      expect(room.leave).toHaveBeenCalledTimes(1);
      // Lo cortó el otro: este dispositivo no manda end
      expect(endCall).not.toHaveBeenCalled();

      act(() => result.current.dismiss());
      expect(result.current.state.status).toBe('idle');
    });

    it('rechazada: se entera del motivo y sale de la sala', async () => {
      const call = makeCall();
      vi.mocked(startCall).mockResolvedValue(joinResponse(call));
      const { result, room } = setup();
      await act(async () => {
        await result.current.start('dm-1');
      });

      await inbox({ type: 'CALL_ENDED', call: { ...call, status: 'ended', endReason: 'declined' } });

      expect(result.current.state).toMatchObject({ status: 'ended', reason: 'declined' });
      expect(room.leave).toHaveBeenCalledTimes(1);
    });

    it('si Voice rechaza (ocupado) propaga el error y vuelve a idle', async () => {
      const busy = new ApiError({ status: 409, code: 'CALL_BUSY' });
      vi.mocked(startCall).mockRejectedValue(busy);
      const { result, room } = setup();

      await act(async () => {
        await expect(result.current.start('dm-1')).rejects.toBe(busy);
      });

      expect(result.current.state.status).toBe('idle');
      expect(room.join).not.toHaveBeenCalled();
    });

    it('no inicia otra con una en curso', async () => {
      vi.mocked(startCall).mockResolvedValue(joinResponse(makeCall()));
      const { result } = setup();
      await act(async () => {
        await result.current.start('dm-1');
      });

      await act(async () => {
        await expect(result.current.start('dm-1')).rejects.toThrow('Ya hay una llamada en curso.');
      });
      expect(startCall).toHaveBeenCalledTimes(1);
    });

    it('colgar mientras suena: canceled, manda end y sale de la sala', async () => {
      vi.mocked(startCall).mockResolvedValue(joinResponse(makeCall()));
      const { result, room } = setup();
      await act(async () => {
        await result.current.start('dm-1');
      });

      await act(async () => {
        await result.current.hangUp();
      });

      expect(result.current.state).toMatchObject({ status: 'ended', reason: 'canceled' });
      expect(endCall).toHaveBeenCalledWith('c1');
      expect(endCall).toHaveBeenCalledTimes(1);
      expect(room.leave).toHaveBeenCalledTimes(1);
    });

    it('colgar antes de que responda POST /calls: no entra a la sala y manda end al tener el id', async () => {
      let respond!: (value: CallJoinResponse) => void;
      vi.mocked(startCall).mockReturnValue(new Promise((resolve) => (respond = resolve)));
      const { result, room } = setup();

      let starting!: Promise<unknown>;
      act(() => {
        starting = result.current.start('dm-1');
      });
      expect(result.current.state).toMatchObject({ status: 'outgoing', call: null });

      await act(async () => {
        await result.current.hangUp();
      });
      expect(result.current.state.status).toBe('idle');

      await act(async () => {
        respond(joinResponse(makeCall()));
        await starting;
      });

      expect(room.join).not.toHaveBeenCalled();
      expect(endCall).toHaveBeenCalledWith('c1');
      expect(result.current.state.status).toBe('idle');
    });

    it('si no puede entrar a la sala, corta la llamada y propaga el error', async () => {
      vi.mocked(startCall).mockResolvedValue(joinResponse(makeCall()));
      const { result, room } = setup();
      room.join.mockRejectedValue(new Error('sin WebRTC'));

      await act(async () => {
        await expect(result.current.start('dm-1')).rejects.toThrow('sin WebRTC');
      });

      expect(result.current.state.status).toBe('idle');
      expect(endCall).toHaveBeenCalledWith('c1');
    });

    it('timeout local: sin noticias a los expiresAt + 10 s es missed y quien llama manda end', async () => {
      vi.useFakeTimers();
      vi.mocked(startCall).mockResolvedValue(joinResponse(makeCall()));
      const { result } = setup();
      await act(async () => {
        await result.current.start('dm-1');
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000 + CALL_LOCAL_TIMEOUT_GRACE_MS - 100);
      });
      expect(result.current.state.status).toBe('outgoing');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });
      expect(result.current.state).toMatchObject({ status: 'ended', reason: 'missed' });
      expect(endCall).toHaveBeenCalledWith('c1');
    });
  });

  describe('quien recibe', () => {
    it('suena, atiende: pide accept, entra a la sala y queda activa', async () => {
      const call = incomingCall();
      vi.mocked(acceptCall).mockResolvedValue(joinResponse({ ...call, status: 'active' }));
      const { result, room } = setup();

      await inbox({ type: 'CALL_RINGING', call });
      expect(result.current.state).toMatchObject({ status: 'incoming', role: 'callee', accepting: false });
      expect(room.join).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.accept();
      });

      expect(acceptCall).toHaveBeenCalledWith('c1');
      expect(room.join).toHaveBeenCalledWith('call-c1', expect.any(Object));
      expect(result.current.state).toMatchObject({ status: 'active', role: 'callee' });
    });

    it('rechazar deja de sonar ya y avisa a Voice', async () => {
      const { result } = setup();
      await inbox({ type: 'CALL_RINGING', call: incomingCall() });

      await act(async () => {
        await result.current.decline();
      });

      expect(declineCall).toHaveBeenCalledWith('c1');
      expect(result.current.state.status).toBe('idle');
    });

    it('colgar mientras suena es rechazar', async () => {
      const { result } = setup();
      await inbox({ type: 'CALL_RINGING', call: incomingCall() });

      await act(async () => {
        await result.current.hangUp();
      });

      expect(declineCall).toHaveBeenCalledWith('c1');
      expect(endCall).not.toHaveBeenCalled();
    });

    it('accept con 403 (bloqueo entre el timbre y el aceptar): unavailable', async () => {
      const blocked = new ApiError({ status: 403, code: 'DM_NOT_DELIVERABLE' });
      vi.mocked(acceptCall).mockRejectedValue(blocked);
      const { result, room } = setup();
      await inbox({ type: 'CALL_RINGING', call: incomingCall() });

      await act(async () => {
        await expect(result.current.accept()).rejects.toBe(blocked);
      });

      expect(result.current.state).toMatchObject({ status: 'ended', reason: 'unavailable' });
      expect(room.join).not.toHaveBeenCalled();
    });

    it('accept con 409 (atendió otro dispositivo): reconcilia y deja de sonar', async () => {
      const call = incomingCall();
      vi.mocked(acceptCall).mockRejectedValue(new ApiError({ status: 409, code: 'CALL_NOT_RINGING' }));
      const { result } = setup();
      await inbox({ type: 'CALL_RINGING', call });
      vi.mocked(getCurrentCall).mockResolvedValue({ ...call, status: 'active' });

      await act(async () => {
        await result.current.accept().catch(() => undefined);
      });

      await waitFor(() => expect(result.current.state.status).toBe('idle'));
    });

    it('atendió otro dispositivo propio: deja de sonar', async () => {
      const call = incomingCall();
      const { result } = setup();
      await inbox({ type: 'CALL_RINGING', call });

      await inbox({ type: 'CALL_ACCEPTED', call: { ...call, status: 'active' } });

      expect(result.current.state.status).toBe('idle');
    });

    it('timeout local de quien recibe: missed sin mandar end', async () => {
      vi.useFakeTimers();
      const { result } = setup();
      await inbox({ type: 'CALL_RINGING', call: incomingCall() });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000 + CALL_LOCAL_TIMEOUT_GRACE_MS + 100);
      });

      expect(result.current.state).toMatchObject({ status: 'ended', reason: 'missed' });
      expect(endCall).not.toHaveBeenCalled();
    });
  });

  describe('rol', () => {
    it('la llamada de otro dispositivo propio (como quien llama) no suena', async () => {
      const { result } = setup();

      await inbox({ type: 'CALL_RINGING', call: makeCall() });

      expect(result.current.state.status).toBe('idle');
    });

    it('si la conversación no está en el caché la pide', async () => {
      const { result } = setup({ cached: false });

      await inbox({ type: 'CALL_RINGING', call: incomingCall() });

      await waitFor(() => expect(result.current.state.status).toBe('incoming'));
      expect(getConversations).toHaveBeenCalled();
    });

    it('una conversación desconocida se ignora', async () => {
      vi.mocked(getConversations).mockResolvedValue([]);
      const { result } = setup({ cached: false });

      await inbox({ type: 'CALL_RINGING', call: incomingCall() });

      await waitFor(() => expect(getConversations).toHaveBeenCalled());
      expect(result.current.state.status).toBe('idle');
    });
  });

  describe('sala', () => {
    async function activeCall() {
      const call = makeCall();
      vi.mocked(startCall).mockResolvedValue(joinResponse(call));
      const ctx = setup();
      await act(async () => {
        await ctx.result.current.start('dm-1');
      });
      await inbox({ type: 'CALL_ACCEPTED', call: { ...call, status: 'active' } });
      return { ...ctx, call };
    }

    it('LiveKit cerró la sala: manda end y, si Voice no avisa, termina después de la espera', async () => {
      vi.useFakeTimers();
      const { result, room } = await activeCall();

      await act(async () => {
        await joinOptions(room).onLeave!('removed');
      });
      expect(endCall).toHaveBeenCalledWith('c1');
      expect(result.current.state.status).toBe('active');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(CALL_ROOM_CLOSED_GRACE_MS);
      });
      expect(result.current.state).toMatchObject({ status: 'ended', reason: 'ended' });
    });

    it('LiveKit cerró la sala y enseguida llega el motivo real: gana el motivo', async () => {
      vi.useFakeTimers();
      const { result, room, call } = await activeCall();

      await act(async () => {
        await joinOptions(room).onLeave!('removed');
      });
      await inbox({ type: 'CALL_ENDED', call: { ...call, status: 'ended', endReason: 'unavailable' } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(CALL_ROOM_CLOSED_GRACE_MS);
      });

      expect(result.current.state).toMatchObject({ status: 'ended', reason: 'unavailable' });
    });

    it('salir de la sala sin cortar (entrar a un canal de voz) termina la llamada', async () => {
      const { result, room } = await activeCall();

      await act(async () => {
        await joinOptions(room).onLeave!();
      });

      expect(result.current.state).toMatchObject({ status: 'ended', reason: 'ended' });
      expect(endCall).toHaveBeenCalledWith('c1');
      // La sala ya la cerró useVoiceRoom
      expect(room.leave).not.toHaveBeenCalled();
    });

    it('cuando la cierra la máquina, onLeave no manda otro end', async () => {
      const { result, room } = await activeCall();
      await act(async () => {
        await result.current.hangUp();
      });
      expect(endCall).toHaveBeenCalledTimes(1);

      await act(async () => {
        await joinOptions(room).onLeave!();
      });
      expect(endCall).toHaveBeenCalledTimes(1);
    });

    it('con el mock de API no entra a LiveKit', async () => {
      setApiMock({} as never);
      vi.mocked(startCall).mockResolvedValue(joinResponse(makeCall()));
      const { result, room } = setup();

      await act(async () => {
        await result.current.start('dm-1');
      });

      expect(result.current.state.status).toBe('outgoing');
      expect(room.join).not.toHaveBeenCalled();
    });
  });

  describe('reconciliación', () => {
    it('al montar pide la llamada actual y recupera la que suena', async () => {
      vi.mocked(getCurrentCall).mockResolvedValue(incomingCall());
      const { result } = setup();

      await waitFor(() => expect(result.current.state.status).toBe('incoming'));
    });

    it('al reconectar el inbox: la llamada terminó mientras no había noticias', async () => {
      vi.mocked(startCall).mockResolvedValue(joinResponse(makeCall()));
      const { result } = setup();
      await act(async () => {
        await result.current.start('dm-1');
      });
      await inbox({ type: 'CALL_ACCEPTED', call: makeCall({ status: 'active' }) });
      vi.mocked(getCurrentCall).mockClear().mockResolvedValue(null);

      await act(async () => {
        publishInboxReconnect();
      });

      expect(getCurrentCall).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(result.current.state).toMatchObject({ status: 'ended', reason: 'ended' }));
    });

    it('al volver de enabled en false reconcilia', async () => {
      const { rerender } = setup({ enabled: false });
      expect(getCurrentCall).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => expect(getCurrentCall).toHaveBeenCalledTimes(1));
    });

    it('una respuesta que llega después de un cambio de estado se descarta', async () => {
      let respond!: (call: Call | null) => void;
      vi.mocked(getCurrentCall).mockReturnValue(new Promise((resolve) => (respond = resolve)));
      const { result } = setup();

      await inbox({ type: 'CALL_RINGING', call: incomingCall() });
      await act(async () => {
        respond(null);
      });

      expect(result.current.state.status).toBe('incoming');
    });

    it('sin sesión vuelve a idle y no reconcilia', async () => {
      const { result, rerender } = setup();
      await inbox({ type: 'CALL_RINGING', call: incomingCall() });
      vi.mocked(getCurrentCall).mockClear();

      sessionStatus.current = 'unauthenticated';
      rerender({ enabled: true });

      expect(result.current.state.status).toBe('idle');
      expect(getCurrentCall).not.toHaveBeenCalled();
    });
  });
});
