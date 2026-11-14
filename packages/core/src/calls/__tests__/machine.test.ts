import { describe, it, expect } from 'vitest';
import type { Call } from '../../api/calls';
import {
  CALL_LOCAL_TIMEOUT_GRACE_MS,
  callLocalDeadline,
  callReducer,
  callRoleFor,
  INITIAL_CALL_STATE,
  type CallAction,
  type PrivateCallState,
} from '../machine';

const ME = 'me';
const OTHER = 'other';

const call = (overrides: Partial<Call> = {}): Call => ({
  id: 'c1',
  conversationId: 'dm-1',
  callerId: ME,
  calleeId: OTHER,
  status: 'ringing',
  createdAt: '2026-11-12T10:00:00.000Z',
  expiresAt: '2026-11-12T10:00:30.000Z',
  ...overrides,
});

/** Una llamada que recibe el usuario. */
const incomingCall = (overrides: Partial<Call> = {}) => call({ callerId: OTHER, calleeId: ME, ...overrides });

const run = (...actions: CallAction[]) => actions.reduce(callReducer, INITIAL_CALL_STATE);

const outgoing = () =>
  run({ type: 'START_REQUESTED', conversationId: 'dm-1' }, { type: 'START_SUCCEEDED', call: call() });
const incoming = (overrides: Partial<Call> = {}) =>
  run({ type: 'CALL_RINGING', call: incomingCall(overrides), role: 'callee' });
const activeAsCaller = () => callReducer(outgoing(), { type: 'CALL_ACCEPTED', call: call({ status: 'active' }), role: 'caller' });

const ended = (state: PrivateCallState) => {
  if (state.status !== 'ended') throw new Error(`esperaba ended y es ${state.status}`);
  return state;
};

describe('callRoleFor', () => {
  it('deduce el rol comparando con el otro participante, no con el id propio', () => {
    expect(callRoleFor(call(), OTHER)).toBe('caller');
    expect(callRoleFor(incomingCall(), OTHER)).toBe('callee');
    expect(callRoleFor(call(), 'otro-mas')).toBeNull();
  });
});

describe('callReducer: quien llama', () => {
  it('idle → outgoing (iniciando) → outgoing con la llamada → active → ended', () => {
    let state = callReducer(INITIAL_CALL_STATE, { type: 'START_REQUESTED', conversationId: 'dm-1' });
    expect(state).toMatchObject({ status: 'outgoing', call: null, role: 'caller' });

    state = callReducer(state, { type: 'START_SUCCEEDED', call: call() });
    expect(state).toMatchObject({ status: 'outgoing', call: { id: 'c1' } });

    state = callReducer(state, { type: 'CALL_ACCEPTED', call: call({ status: 'active' }), role: 'caller' });
    expect(state).toMatchObject({ status: 'active', role: 'caller' });

    state = callReducer(state, { type: 'CALL_ENDED', call: call({ status: 'ended', endReason: 'ended' }), role: 'caller' });
    expect(ended(state)).toMatchObject({ reason: 'ended', role: 'caller' });
    expect(state.finished).toContain('c1');
  });

  it.each(['declined', 'missed', 'canceled', 'unavailable'] as const)('se entera de cómo terminó: %s', (reason) => {
    const state = callReducer(outgoing(), { type: 'CALL_ENDED', call: call({ status: 'ended', endReason: reason }), role: 'caller' });
    expect(ended(state).reason).toBe(reason);
  });

  it('si POST /calls falla vuelve a idle', () => {
    const state = run({ type: 'START_REQUESTED', conversationId: 'dm-1' }, { type: 'START_FAILED', conversationId: 'dm-1' });
    expect(state.status).toBe('idle');
  });

  it('no inicia otra si ya hay una en curso', () => {
    const state = outgoing();
    expect(callReducer(state, { type: 'START_REQUESTED', conversationId: 'dm-2' })).toBe(state);
    expect(callReducer(incoming(), { type: 'START_REQUESTED', conversationId: 'dm-2' }).status).toBe('incoming');
  });

  it('desde ended se puede volver a llamar', () => {
    const state = callReducer(outgoing(), { type: 'HANG_UP_REQUESTED' });
    expect(callReducer(state, { type: 'START_REQUESTED', conversationId: 'dm-1' })).toMatchObject({ status: 'outgoing', call: null });
  });

  it('colgar mientras suena es canceled; activa, ended; antes de tener id, idle', () => {
    expect(ended(callReducer(outgoing(), { type: 'HANG_UP_REQUESTED' })).reason).toBe('canceled');
    expect(ended(callReducer(activeAsCaller(), { type: 'HANG_UP_REQUESTED' })).reason).toBe('ended');
    const starting = run({ type: 'START_REQUESTED', conversationId: 'dm-1' }, { type: 'HANG_UP_REQUESTED' });
    expect(starting.status).toBe('idle');
  });

  describe('carreras con el inbox', () => {
    it('el RINGING propio llega antes que la respuesta de POST /calls', () => {
      let state = run(
        { type: 'START_REQUESTED', conversationId: 'dm-1' },
        { type: 'CALL_RINGING', call: call(), role: 'caller' }
      );
      expect(state).toMatchObject({ status: 'outgoing', call: { id: 'c1' } });

      state = callReducer(state, { type: 'START_SUCCEEDED', call: call() });
      expect(state).toMatchObject({ status: 'outgoing', call: { id: 'c1' } });
    });

    it('el ACCEPTED llega antes que la respuesta de POST /calls', () => {
      let state = run(
        { type: 'START_REQUESTED', conversationId: 'dm-1' },
        { type: 'CALL_ACCEPTED', call: call({ status: 'active' }), role: 'caller' }
      );
      expect(state.status).toBe('active');
      state = callReducer(state, { type: 'START_SUCCEEDED', call: call() });
      expect(state.status).toBe('active');
    });

    it('el ENDED llega antes que la respuesta de POST /calls: la respuesta no la revive', () => {
      let state = run(
        { type: 'START_REQUESTED', conversationId: 'dm-1' },
        { type: 'CALL_ENDED', call: call({ status: 'ended', endReason: 'declined' }), role: 'caller' }
      );
      expect(ended(state).reason).toBe('declined');
      state = callReducer(state, { type: 'START_SUCCEEDED', call: call() });
      expect(ended(state).reason).toBe('declined');
    });

    it('colgó mientras se iniciaba: la respuesta tardía no la revive', () => {
      const state = run(
        { type: 'START_REQUESTED', conversationId: 'dm-1' },
        { type: 'HANG_UP_REQUESTED' },
        { type: 'START_SUCCEEDED', call: call() }
      );
      expect(state.status).toBe('idle');
    });

    it('un RINGING tardío después del ACCEPTED no vuelve atrás', () => {
      const state = activeAsCaller();
      expect(callReducer(state, { type: 'CALL_RINGING', call: call(), role: 'caller' })).toBe(state);
    });

    it('ignora eventos de otra llamada', () => {
      const state = outgoing();
      const other = call({ id: 'c2', conversationId: 'dm-2' });
      expect(callReducer(state, { type: 'CALL_ACCEPTED', call: { ...other, status: 'active' }, role: 'caller' })).toBe(state);
      expect(callReducer(state, { type: 'CALL_ENDED', call: { ...other, status: 'ended', endReason: 'ended' }, role: 'caller' })).toBe(state);
      expect(callReducer(state, { type: 'CALL_RINGING', call: incomingCall({ id: 'c3' }), role: 'callee' })).toBe(state);
    });

    it('ignora eventos de una llamada que ya terminó, aunque después se descarte el aviso', () => {
      const done = callReducer(callReducer(outgoing(), { type: 'HANG_UP_REQUESTED' }), { type: 'DISMISSED' });
      expect(done.status).toBe('idle');
      expect(callReducer(done, { type: 'CALL_RINGING', call: incomingCall(), role: 'callee' })).toBe(done);
      expect(callReducer(done, { type: 'CALL_ENDED', call: call({ status: 'ended', endReason: 'canceled' }), role: 'caller' })).toBe(done);
    });

    it('la llamada de otro dispositivo propio (como quien llama) no se muestra', () => {
      const state = run({ type: 'CALL_RINGING', call: call(), role: 'caller' });
      expect(state.status).toBe('idle');
      expect(callReducer(state, { type: 'CALL_ENDED', call: call({ status: 'ended', endReason: 'missed' }), role: 'caller' }).status).toBe('idle');
    });

    it('un evento con rol desconocido se ignora', () => {
      expect(run({ type: 'CALL_RINGING', call: incomingCall(), role: null }).status).toBe('idle');
    });
  });
});

describe('callReducer: quien recibe', () => {
  it('idle → incoming → aceptando → active → ended', () => {
    let state = incoming();
    expect(state).toMatchObject({ status: 'incoming', role: 'callee', accepting: false });

    state = callReducer(state, { type: 'ACCEPT_REQUESTED', callId: 'c1' });
    expect(state).toMatchObject({ status: 'incoming', accepting: true });

    state = callReducer(state, { type: 'ACCEPT_SUCCEEDED', call: incomingCall({ status: 'active' }) });
    expect(state).toMatchObject({ status: 'active', role: 'callee' });

    state = callReducer(state, { type: 'CALL_ENDED', call: incomingCall({ status: 'ended', endReason: 'ended' }), role: 'callee' });
    expect(ended(state)).toMatchObject({ reason: 'ended', role: 'callee' });
  });

  it('rechazar vuelve a idle sin aviso y un ENDED tardío no hace nada', () => {
    const state = callReducer(incoming(), { type: 'DECLINE_REQUESTED', callId: 'c1' });
    expect(state.status).toBe('idle');
    const late = incomingCall({ status: 'ended', endReason: 'declined' });
    expect(callReducer(state, { type: 'CALL_ENDED', call: late, role: 'callee' })).toBe(state);
  });

  it('colgar mientras suena es rechazar', () => {
    expect(callReducer(incoming(), { type: 'HANG_UP_REQUESTED' }).status).toBe('idle');
  });

  it('quien llama cortó antes de atender: llamada perdida', () => {
    const state = callReducer(incoming(), {
      type: 'CALL_ENDED',
      call: incomingCall({ status: 'ended', endReason: 'canceled' }),
      role: 'callee',
    });
    expect(ended(state).reason).toBe('canceled');
  });

  it('atendió otro dispositivo propio: deja de sonar sin aviso', () => {
    const state = callReducer(incoming(), { type: 'CALL_ACCEPTED', call: incomingCall({ status: 'active' }), role: 'callee' });
    expect(state.status).toBe('idle');
    expect(state.finished).toContain('c1');
  });

  it('rechazó otro dispositivo propio: deja de sonar sin aviso', () => {
    const state = callReducer(incoming(), {
      type: 'CALL_ENDED',
      call: incomingCall({ status: 'ended', endReason: 'declined' }),
      role: 'callee',
    });
    expect(state.status).toBe('idle');
  });

  it('atendiendo acá, el ACCEPTED del inbox espera la respuesta de accept', () => {
    let state = callReducer(incoming(), { type: 'ACCEPT_REQUESTED', callId: 'c1' });
    state = callReducer(state, { type: 'CALL_ACCEPTED', call: incomingCall({ status: 'active' }), role: 'callee' });
    expect(state).toMatchObject({ status: 'incoming', accepting: true });
    state = callReducer(state, { type: 'ACCEPT_SUCCEEDED', call: incomingCall({ status: 'active' }) });
    expect(state.status).toBe('active');
  });

  it('accept rechazado por bloqueo: unavailable', () => {
    const state = run(
      { type: 'CALL_RINGING', call: incomingCall(), role: 'callee' },
      { type: 'ACCEPT_REQUESTED', callId: 'c1' },
      { type: 'ACCEPT_FAILED', callId: 'c1', reason: 'unavailable' }
    );
    expect(ended(state).reason).toBe('unavailable');
  });

  it('accept fallido por red: vuelve a sonar', () => {
    const state = run(
      { type: 'CALL_RINGING', call: incomingCall(), role: 'callee' },
      { type: 'ACCEPT_REQUESTED', callId: 'c1' },
      { type: 'ACCEPT_FAILED', callId: 'c1' }
    );
    expect(state).toMatchObject({ status: 'incoming', accepting: false });
  });

  it('venció el timbre mientras atendía: gana el ENDED aunque esté aceptando', () => {
    const state = run(
      { type: 'CALL_RINGING', call: incomingCall(), role: 'callee' },
      { type: 'ACCEPT_REQUESTED', callId: 'c1' },
      { type: 'CALL_ENDED', call: incomingCall({ status: 'ended', endReason: 'missed' }), role: 'callee' },
      { type: 'ACCEPT_SUCCEEDED', call: incomingCall({ status: 'active' }) }
    );
    expect(ended(state).reason).toBe('missed');
  });

  it('una segunda llamada mientras suena la primera se ignora', () => {
    const state = incoming();
    expect(callReducer(state, { type: 'CALL_RINGING', call: incomingCall({ id: 'c2' }), role: 'callee' })).toBe(state);
  });

  it('desde ended puede sonar una nueva', () => {
    const state = callReducer(incoming(), {
      type: 'CALL_ENDED',
      call: incomingCall({ status: 'ended', endReason: 'canceled' }),
      role: 'callee',
    });
    expect(callReducer(state, { type: 'CALL_RINGING', call: incomingCall({ id: 'c2' }), role: 'callee' })).toMatchObject({
      status: 'incoming',
      call: { id: 'c2' },
    });
  });
});

describe('callReducer: timeout local, sala y reconciliación', () => {
  it('sin noticias, la que suena pasa a missed (las dos puntas)', () => {
    expect(ended(callReducer(outgoing(), { type: 'TIMED_OUT', callId: 'c1' })).reason).toBe('missed');
    expect(ended(callReducer(incoming(), { type: 'TIMED_OUT', callId: 'c1' })).reason).toBe('missed');
  });

  it('el timeout de otra llamada, de una activa o mientras se atiende no hace nada', () => {
    const state = outgoing();
    expect(callReducer(state, { type: 'TIMED_OUT', callId: 'c2' })).toBe(state);
    const active = activeAsCaller();
    expect(callReducer(active, { type: 'TIMED_OUT', callId: 'c1' })).toBe(active);
    const accepting = callReducer(incoming(), { type: 'ACCEPT_REQUESTED', callId: 'c1' });
    expect(callReducer(accepting, { type: 'TIMED_OUT', callId: 'c1' })).toBe(accepting);
  });

  it('el vencimiento local es expiresAt + 10 s, solo mientras suena', () => {
    expect(callLocalDeadline(outgoing())).toBe(Date.parse(call().expiresAt) + CALL_LOCAL_TIMEOUT_GRACE_MS);
    expect(callLocalDeadline(incoming())).toBe(Date.parse(call().expiresAt) + CALL_LOCAL_TIMEOUT_GRACE_MS);
    expect(callLocalDeadline(activeAsCaller())).toBeNull();
    expect(callLocalDeadline(run({ type: 'START_REQUESTED', conversationId: 'dm-1' }))).toBeNull();
    expect(callLocalDeadline(callReducer(incoming(), { type: 'ACCEPT_REQUESTED', callId: 'c1' }))).toBeNull();
  });

  it('la sala se cerró sola: la llamada termina (no es "te sacaron del canal")', () => {
    expect(ended(callReducer(activeAsCaller(), { type: 'ROOM_CLOSED', callId: 'c1' })).reason).toBe('ended');
    expect(ended(callReducer(outgoing(), { type: 'ROOM_CLOSED', callId: 'c1' })).reason).toBe('ended');
    const state = activeAsCaller();
    expect(callReducer(state, { type: 'ROOM_CLOSED', callId: 'c2' })).toBe(state);
  });

  it('no se pudo entrar a la sala: idle', () => {
    expect(callReducer(outgoing(), { type: 'JOIN_FAILED', callId: 'c1' }).status).toBe('idle');
  });

  it('reconciliar sin llamada en el backend: la abierta terminó mientras no había noticias', () => {
    expect(ended(callReducer(activeAsCaller(), { type: 'RECONCILED', call: null, role: null })).reason).toBe('ended');
    expect(ended(callReducer(outgoing(), { type: 'RECONCILED', call: null, role: null })).reason).toBe('ended');
    expect(ended(callReducer(incoming(), { type: 'RECONCILED', call: null, role: null })).reason).toBe('missed');
    expect(callReducer(INITIAL_CALL_STATE, { type: 'RECONCILED', call: null, role: null })).toBe(INITIAL_CALL_STATE);
  });

  it('reconciliar mientras se inicia no hace nada (decide POST /calls)', () => {
    const starting = run({ type: 'START_REQUESTED', conversationId: 'dm-1' });
    expect(callReducer(starting, { type: 'RECONCILED', call: null, role: null })).toBe(starting);
  });

  it('reconciliar recupera una llamada que suena para el usuario', () => {
    const state = callReducer(INITIAL_CALL_STATE, { type: 'RECONCILED', call: incomingCall(), role: 'callee' });
    expect(state).toMatchObject({ status: 'incoming', call: { id: 'c1' } });
  });

  it('reconciliar no muestra una activa sin este dispositivo en la sala, ni la que suena como quien llama', () => {
    expect(callReducer(INITIAL_CALL_STATE, { type: 'RECONCILED', call: call({ status: 'active' }), role: 'caller' }).status).toBe('idle');
    expect(callReducer(INITIAL_CALL_STATE, { type: 'RECONCILED', call: call(), role: 'caller' }).status).toBe('idle');
  });

  it('reconciliar: atendieron mientras no había noticias', () => {
    expect(callReducer(outgoing(), { type: 'RECONCILED', call: call({ status: 'active' }), role: 'caller' }).status).toBe('active');
    // Quien recibe sin estar atendiendo acá: atendió otro dispositivo
    expect(callReducer(incoming(), { type: 'RECONCILED', call: incomingCall({ status: 'active' }), role: 'callee' }).status).toBe('idle');
  });

  it('reconciliar con otra llamada: la de este dispositivo terminó y suena la nueva', () => {
    const state = callReducer(activeAsCaller(), { type: 'RECONCILED', call: incomingCall({ id: 'c2' }), role: 'callee' });
    expect(state).toMatchObject({ status: 'incoming', call: { id: 'c2' } });
    expect(state.finished).toContain('c1');
  });

  it('dismiss solo sale de ended; reset vuelve a idle recordando la llamada', () => {
    const active = activeAsCaller();
    expect(callReducer(active, { type: 'DISMISSED' })).toBe(active);
    const reset = callReducer(active, { type: 'RESET' });
    expect(reset.status).toBe('idle');
    expect(reset.finished).toContain('c1');
    expect(callReducer(reset, { type: 'RESET' })).toBe(reset);
  });

  it('recuerda solo las últimas llamadas terminadas', () => {
    let state: PrivateCallState = INITIAL_CALL_STATE;
    for (let i = 0; i < 30; i += 1) {
      state = callReducer(state, { type: 'CALL_RINGING', call: incomingCall({ id: `c${i}` }), role: 'callee' });
      state = callReducer(state, { type: 'DECLINE_REQUESTED', callId: `c${i}` });
    }
    expect(state.finished).toHaveLength(20);
    expect(state.finished[19]).toBe('c29');
  });
});
