import type { Call, CallEndReason, CallJoinResponse } from '../api/calls';
import { ApiError } from '../api/errors';
import type { ApiMock } from '../api/mock';
import type { InboxEvent } from '../realtime/inboxSocket';
import { CURRENT_USER_ID } from './data';

/** Qué hace el otro cuando el usuario simulado lo llama. `none`: no atiende (a los 30 s, `missed`). */
export type MockCallAnswer = 'accept' | 'decline' | 'busy' | 'none';

export interface CallMockOptions {
  /** Respuesta de cada usuario. Default: u1 atiende, u2 rechaza, el resto no atiende. */
  callAnswers?: Record<string, MockCallAnswer>;
  /** Cuánto tarda el otro en atender o rechazar. Default: 3 s. */
  answerDelayMs?: number;
  /** Cuánto suena. Default: 30 s, como Voice. */
  ringMs?: number;
}

export type CallMock = Required<Pick<ApiMock, 'startCall' | 'acceptCall' | 'declineCall' | 'endCall' | 'getCurrentCall'>> & {
  /** Simula que `userId` llama al usuario (tiene que haber una conversación `dm-<userId>`). */
  simulateIncomingCall(userId: string): Call;
  /** Simula que el otro corta la llamada en curso (sonando: `canceled`; activa: `ended`). */
  simulateRemoteHangUp(): void;
};

interface CallMockDeps {
  emit: (event: InboxEvent) => void;
  /** El otro participante si se puede llamar en esa conversación; si no, rechaza como Voice (403 / 404). */
  callAccess: (conversationId: string) => string;
}

const DEFAULT_ANSWERS: Record<string, MockCallAnswer> = { u1: 'accept', u2: 'decline' };

const FAKE_CREDENTIALS = {
  token: 'mock-livekit-token',
  url: 'ws://livekit.mock',
  permissions: { canSpeak: true, canVideo: false, canScreenShare: false },
};

/**
 * Llamadas privadas simuladas, con las reglas de Voice: una llamada a la vez, suena 30 s, solo quien recibe
 * atiende o rechaza, end idempotente. Los avisos llegan por el inbox simulado, como en el backend.
 */
export function createCallMock(
  { emit, callAccess }: CallMockDeps,
  { callAnswers = DEFAULT_ANSWERS, answerDelayMs = 3_000, ringMs = 30_000 }: CallMockOptions = {}
): CallMock {
  let current: Call | null = null;
  let sequence = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const later = (ms: number, fn: () => void) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers.clear();
  };

  const finish = (call: Call, reason: CallEndReason) => {
    if (current?.id !== call.id) return;
    clearTimers();
    const endedCall: Call = { ...call, status: 'ended', endReason: reason, endedAt: new Date().toISOString() };
    current = null;
    emit({ type: 'CALL_ENDED', call: endedCall });
  };

  const answer = (call: Call) => {
    if (current?.id !== call.id || call.status !== 'ringing') return current!;
    clearTimers();
    current = { ...call, status: 'active', answeredAt: new Date().toISOString() };
    emit({ type: 'CALL_ACCEPTED', call: current });
    return current;
  };

  const ring = (conversationId: string, callerId: string, calleeId: string): Call => {
    sequence += 1;
    const now = Date.now();
    current = {
      id: `call-mock-${now}-${sequence}`,
      conversationId,
      callerId,
      calleeId,
      status: 'ringing',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ringMs).toISOString(),
    };
    const call = current;
    later(ringMs, () => finish(call, 'missed'));
    emit({ type: 'CALL_RINGING', call });
    return call;
  };

  const owned = (callId: string) => {
    if (current?.id !== callId) throw new ApiError({ status: 404, code: 'CALL_NOT_FOUND', detail: 'Mock call not found' });
    return current;
  };

  const ringingForMe = (callId: string) => {
    const call = owned(callId);
    if (call.calleeId !== CURRENT_USER_ID) throw new ApiError({ status: 404, code: 'CALL_NOT_FOUND', detail: 'Mock call not found' });
    if (call.status !== 'ringing') throw new ApiError({ status: 409, code: 'CALL_NOT_RINGING', detail: 'Mock call not ringing' });
    return call;
  };

  return {
    async startCall(conversationId): Promise<CallJoinResponse> {
      const otherUserId = callAccess(conversationId);
      const reply = callAnswers[otherUserId] ?? 'none';
      if (current || reply === 'busy') throw new ApiError({ status: 409, code: 'CALL_BUSY', detail: 'CALL_BUSY' });

      const call = ring(conversationId, CURRENT_USER_ID, otherUserId);
      if (reply === 'accept') later(answerDelayMs, () => answer(call));
      if (reply === 'decline') later(answerDelayMs, () => finish(call, 'declined'));
      return { call, ...FAKE_CREDENTIALS };
    },

    async acceptCall(callId) {
      return { call: answer(ringingForMe(callId)), ...FAKE_CREDENTIALS };
    },

    async declineCall(callId) {
      finish(ringingForMe(callId), 'declined');
    },

    async endCall(callId) {
      // Idempotente: una que ya terminó responde igual
      if (current?.id !== callId) return;
      const reason: CallEndReason =
        current.status === 'active' ? 'ended' : current.callerId === CURRENT_USER_ID ? 'canceled' : 'declined';
      finish(current, reason);
    },

    async getCurrentCall() {
      return current ? { ...current } : null;
    },

    simulateIncomingCall(userId) {
      const conversationId = `dm-${userId}`;
      callAccess(conversationId);
      if (current) throw new ApiError({ status: 409, code: 'CALL_BUSY', detail: 'CALL_BUSY' });
      return ring(conversationId, userId, CURRENT_USER_ID);
    },

    simulateRemoteHangUp() {
      if (!current) return;
      const remoteIsCaller = current.callerId !== CURRENT_USER_ID;
      const reason: CallEndReason =
        current.status === 'active' ? 'ended' : remoteIsCaller ? 'canceled' : 'declined';
      finish(current, reason);
    },
  };
}
