import type { Call, CallEndReason } from '../api/calls';

/** caller: quien llama. callee: quien recibe. */
export type CallRole = 'caller' | 'callee';

/**
 * El rol del usuario en `call`, comparando con el otro participante de la conversación (los ids de la
 * llamada son canónicos y el `sub` propio puede ser un alias). null si `otherUserId` no es ninguno de los dos.
 */
export function callRoleFor(call: Pick<Call, 'callerId' | 'calleeId'>, otherUserId: string): CallRole | null {
  if (call.calleeId === otherUserId) return 'caller';
  if (call.callerId === otherUserId) return 'callee';
  return null;
}

/** Cuánto después de `expiresAt` se da por perdida una llamada que sigue sonando sin noticias del backend. */
export const CALL_LOCAL_TIMEOUT_GRACE_MS = 10_000;

/** Llamadas que este dispositivo ya cerró: un evento tardío de ellas se ignora. Se guardan las últimas. */
const FINISHED_LIMIT = 20;

interface Base {
  /** Ids de llamadas ya cerradas en este dispositivo (las más recientes al final). */
  finished: readonly string[];
}

/**
 * Estado de la llamada en este dispositivo. `outgoing` y `active` son las que tienen sala: quien llama entra
 * al iniciar, quien recibe al aceptar. `outgoing` con `call` null: el pedido para iniciar está en curso.
 */
export type PrivateCallState =
  | (Base & { status: 'idle' })
  | (Base & { status: 'outgoing'; conversationId: string; call: Call | null; role: 'caller' })
  | (Base & { status: 'incoming'; conversationId: string; call: Call; role: 'callee'; accepting: boolean })
  | (Base & { status: 'active'; conversationId: string; call: Call; role: CallRole })
  | (Base & { status: 'ended'; conversationId: string; call: Call; role: CallRole; reason: CallEndReason });

export const INITIAL_CALL_STATE: PrivateCallState = { status: 'idle', finished: [] };

/**
 * Lo que mueve la máquina. Los CALL_* y RECONCILED traen el rol ya resuelto (null si no se pudo: la llamada
 * no es de una conversación conocida y se ignora).
 */
export type CallAction =
  // Pedidos a la API desde este dispositivo
  | { type: 'START_REQUESTED'; conversationId: string }
  | { type: 'START_SUCCEEDED'; call: Call }
  | { type: 'START_FAILED'; conversationId: string }
  | { type: 'ACCEPT_REQUESTED'; callId: string }
  | { type: 'ACCEPT_SUCCEEDED'; call: Call }
  /** `reason`: la llamada terminó por el rechazo (403 → unavailable). Sin motivo, vuelve a sonar. */
  | { type: 'ACCEPT_FAILED'; callId: string; reason?: CallEndReason }
  | { type: 'DECLINE_REQUESTED'; callId: string }
  | { type: 'HANG_UP_REQUESTED' }
  /** No se pudo entrar a la sala: la llamada se corta y no hay nada que mostrar (el error lo muestra quien llamó). */
  | { type: 'JOIN_FAILED'; callId: string }
  // Inbox
  | { type: 'CALL_RINGING' | 'CALL_ACCEPTED' | 'CALL_ENDED'; call: Call; role: CallRole | null }
  // getCurrentCall al reconectar
  | { type: 'RECONCILED'; call: Call | null; role: CallRole | null }
  // Timeout local de respaldo (expiresAt + 10 s) y salida inesperada de la sala
  | { type: 'TIMED_OUT'; callId: string }
  | { type: 'ROOM_CLOSED'; callId: string }
  | { type: 'DISMISSED' }
  | { type: 'RESET' };

type Current = Exclude<PrivateCallState, { status: 'idle' }>;

const isOpen = (state: PrivateCallState): state is Extract<PrivateCallState, { status: 'outgoing' | 'incoming' | 'active' }> =>
  state.status === 'outgoing' || state.status === 'incoming' || state.status === 'active';

const currentCallId = (state: PrivateCallState) => (state.status === 'idle' ? null : (state.call?.id ?? null));

const remember = (finished: readonly string[], id: string): readonly string[] =>
  finished.includes(id) ? finished : [...finished, id].slice(-FINISHED_LIMIT);

const idle = (state: PrivateCallState, callId?: string | null): PrivateCallState => ({
  status: 'idle',
  finished: callId ? remember(state.finished, callId) : state.finished,
});

const ended = (state: Current, call: Call, reason: CallEndReason): PrivateCallState => ({
  status: 'ended',
  conversationId: call.conversationId,
  call,
  role: state.role,
  reason,
  finished: remember(state.finished, call.id),
});

/** El backend no tiene la llamada que este dispositivo cree abierta: terminó mientras no había noticias. */
function lostCall(state: PrivateCallState): PrivateCallState {
  if (!isOpen(state) || !state.call) return state;
  // Quien recibe y no atendió: llamada perdida. El resto no sabe el motivo: "finalizada"
  return ended(state, state.call, state.status === 'incoming' ? 'missed' : 'ended');
}

/** Una llamada nueva que suena, cuando este dispositivo no está en ninguna. */
function ringing(state: PrivateCallState, call: Call, role: CallRole | null): PrivateCallState {
  if (call.status !== 'ringing' || role !== 'callee') return state;
  return {
    status: 'incoming',
    conversationId: call.conversationId,
    call,
    role: 'callee',
    accepting: false,
    finished: state.finished,
  };
}

/**
 * Máquina de la llamada privada, pura: `idle → outgoing → active → ended(motivo)` y
 * `idle → incoming → active | ended`. Ignora eventos de otra llamada y los viejos (de una llamada que ya
 * cerró, o que vuelven atrás: un RINGING después del ACCEPTED). Quien llama solo sigue la llamada en el
 * dispositivo que la inició; quien recibe la ve sonar en todos, y al atender o rechazar en uno los otros
 * vuelven a idle sin mostrar nada.
 */
export function callReducer(state: PrivateCallState, action: CallAction): PrivateCallState {
  switch (action.type) {
    case 'START_REQUESTED':
      if (isOpen(state)) return state;
      return {
        status: 'outgoing',
        conversationId: action.conversationId,
        call: null,
        role: 'caller',
        finished: state.finished,
      };

    case 'START_SUCCEEDED': {
      const { call } = action;
      if (state.finished.includes(call.id)) return state;
      if (state.status !== 'outgoing' || state.conversationId !== call.conversationId) return state;
      // El RINGING del inbox pudo llegar antes que la respuesta: no se pisa con algo igual o más viejo
      if (state.call && state.call.id !== call.id) return state;
      return { ...state, call: state.call ?? call };
    }

    case 'START_FAILED':
      if (state.status !== 'outgoing' || state.call || state.conversationId !== action.conversationId) return state;
      return idle(state);

    case 'ACCEPT_REQUESTED':
      if (state.status !== 'incoming' || state.call.id !== action.callId) return state;
      return { ...state, accepting: true };

    case 'ACCEPT_SUCCEEDED':
      if (state.status !== 'incoming' || state.call.id !== action.call.id) return state;
      return {
        status: 'active',
        conversationId: state.conversationId,
        call: action.call,
        role: 'callee',
        finished: state.finished,
      };

    case 'ACCEPT_FAILED':
      if (state.status !== 'incoming' || state.call.id !== action.callId) return state;
      return action.reason ? ended(state, state.call, action.reason) : { ...state, accepting: false };

    case 'DECLINE_REQUESTED':
      // Quien rechaza no necesita un aviso: vuelve a idle
      if (state.status !== 'incoming' || state.call.id !== action.callId) return state;
      return idle(state, state.call.id);

    case 'HANG_UP_REQUESTED':
      if (state.status === 'outgoing') {
        return state.call ? ended(state, state.call, 'canceled') : idle(state);
      }
      if (state.status === 'incoming') return idle(state, state.call.id);
      if (state.status === 'active') return ended(state, state.call, 'ended');
      return state;

    case 'JOIN_FAILED':
      if (!isOpen(state) || currentCallId(state) !== action.callId) return state;
      return idle(state, action.callId);

    case 'CALL_RINGING': {
      const { call, role } = action;
      if (state.finished.includes(call.id)) return state;
      // La propia llamada antes de que responda POST /calls
      if (state.status === 'outgoing' && !state.call && role === 'caller' && state.conversationId === call.conversationId) {
        return { ...state, call };
      }
      if (isOpen(state)) return state;
      return ringing(state, call, role);
    }

    case 'CALL_ACCEPTED': {
      const { call, role } = action;
      if (state.finished.includes(call.id)) return state;
      if (state.status === 'outgoing' && (state.call?.id === call.id || (!state.call && role === 'caller' && state.conversationId === call.conversationId))) {
        return { status: 'active', conversationId: state.conversationId, call, role: 'caller', finished: state.finished };
      }
      if (state.status === 'incoming' && state.call.id === call.id) {
        // Atendiendo acá: se espera la respuesta de accept. Si no, atendió otro dispositivo
        return state.accepting ? state : idle(state, call.id);
      }
      return state;
    }

    case 'CALL_ENDED': {
      const { call } = action;
      if (state.finished.includes(call.id)) return state;
      const reason = call.endReason ?? 'ended';
      if (state.status === 'outgoing' && (state.call?.id === call.id || (!state.call && action.role === 'caller' && state.conversationId === call.conversationId))) {
        return ended(state, call, reason);
      }
      if ((state.status === 'incoming' || state.status === 'active') && state.call.id === call.id) {
        // Rechazada desde otro dispositivo propio: deja de sonar sin aviso
        if (state.status === 'incoming' && reason === 'declined') return idle(state, call.id);
        return ended(state, call, reason);
      }
      return state;
    }

    case 'RECONCILED': {
      const { call, role } = action;
      // Iniciando: la respuesta de POST /calls decide
      if (state.status === 'outgoing' && !state.call) return state;
      if (!call || call.status === 'ended') return lostCall(state);
      if (state.finished.includes(call.id)) return state;

      const currentId = currentCallId(state);
      if (isOpen(state) && currentId !== call.id) {
        // El backend tiene otra llamada como la actual: la de este dispositivo ya no sigue
        return ringing(lostCall(state), call, role);
      }
      if (state.status === 'outgoing') {
        return call.status === 'active'
          ? { status: 'active', conversationId: state.conversationId, call, role: 'caller', finished: state.finished }
          : { ...state, call };
      }
      if (state.status === 'incoming') {
        if (call.status === 'ringing') return { ...state, call };
        // Ya activa: atendió otro dispositivo (o este, y espera la respuesta de accept)
        return state.accepting ? state : idle(state, call.id);
      }
      if (state.status === 'active') return state;
      // idle o ended: solo interesa una que esté sonando para este usuario. Una activa sin este dispositivo
      // en la sala (otro dispositivo, o se recargó la página) no se muestra
      return ringing(state, call, role);
    }

    case 'TIMED_OUT':
      if (state.status === 'outgoing' && state.call?.id === action.callId) return ended(state, state.call, 'missed');
      if (state.status === 'incoming' && state.call.id === action.callId && !state.accepting) {
        return ended(state, state.call, 'missed');
      }
      return state;

    case 'ROOM_CLOSED':
      if ((state.status === 'outgoing' || state.status === 'active') && state.call?.id === action.callId) {
        return ended(state, state.call, 'ended');
      }
      return state;

    case 'DISMISSED':
      return state.status === 'ended' ? idle(state) : state;

    case 'RESET':
      return state.status === 'idle' ? state : idle(state, currentCallId(state));

    default:
      return state;
  }
}

/** El vencimiento local de una llamada que suena, en ms epoch; null si no está sonando o no hay fecha. */
export function callLocalDeadline(state: PrivateCallState): number | null {
  if (state.status !== 'outgoing' && state.status !== 'incoming') return null;
  if (!state.call || (state.status === 'incoming' && state.accepting)) return null;
  const expiresAt = Date.parse(state.call.expiresAt);
  return Number.isNaN(expiresAt) ? null : expiresAt + CALL_LOCAL_TIMEOUT_GRACE_MS;
}
