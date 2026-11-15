import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  acceptCall,
  callRoomId,
  declineCall,
  endCall,
  getCurrentCall,
  startCall,
  type Call,
  type CallJoinResponse,
} from '../api/calls';
import { getConversations } from '../api/conversations';
import { ApiError } from '../api/errors';
import { getApiMock } from '../api/mock';
import { useSession } from '../auth/session';
import {
  callLocalDeadline,
  callReducer,
  callRoleFor,
  INITIAL_CALL_STATE,
  type CallAction,
  type CallRole,
  type PrivateCallState,
} from '../calls/machine';
import { subscribeCallEvents } from '../realtime/callEvents';
import type { CallInboxEvent } from '../realtime/inboxSocket';
import type { Conversation } from '../types';
import { conversationsQueryKey } from './inboxCache';
import type { useVoiceRoom, VoiceDisconnectReason, VoiceJoinResult } from './useVoiceRoom';

/** Lo que usa de la sala de voz de la sesión (la misma instancia de useVoiceRoom que los canales). */
export type PrivateCallRoom = Pick<ReturnType<typeof useVoiceRoom>, 'join' | 'leave'>;

export interface UsePrivateCallOptions {
  room: PrivateCallRoom;
  /** false con la app en segundo plano (como useInbox); al volver a true se reconcilia con el backend. */
  enabled?: boolean;
}

/**
 * Si la sala se cerró sola (red, LiveKit la borró), cuánto se espera el CALL_ENDED con el motivo real antes
 * de darla por terminada: Voice borra la sala antes de publicar el evento.
 */
export const CALL_ROOM_CLOSED_GRACE_MS = 3_000;

/** true si en `state` este dispositivo está (o entra) en la sala de la llamada `callId`. */
function holdsRoom(state: PrivateCallState, callId: string): boolean {
  return (state.status === 'outgoing' || state.status === 'active') && state.call?.id === callId;
}

const isOpen = (state: PrivateCallState) =>
  state.status === 'outgoing' || state.status === 'incoming' || state.status === 'active';

const logError = (what: string) => (err: unknown) => console.error(`[Call] ${what}:`, err);

const credentialsOf = ({ token, url, permissions }: CallJoinResponse) => ({ token, url, permissions });

/**
 * Llamada privada 1 a 1 de la sesión: une la máquina (callReducer), la API de Voice, los eventos del inbox
 * y la sala de voz. Se monta una sola vez, junto a useInbox y con la misma sala que los canales: entrar a
 * una llamada cierra el canal de voz y entrar a un canal corta la llamada.
 *
 * El rol se deduce con la conversación del caché (`otherUserId`). Al reconectar el inbox o volver de
 * `enabled` en false, getCurrentCall() reconcilia. Si el backend no avisa, a los `expiresAt + 10 s` una
 * llamada que sigue sonando pasa a `missed` (y quien llama manda end). Con el mock de API no hay LiveKit:
 * no se entra a la sala.
 */
export function usePrivateCall({ room, enabled = true }: UsePrivateCallOptions) {
  const queryClient = useQueryClient();
  const sessionStatus = useSession((s) => s.status);
  const authenticated = sessionStatus === 'authenticated';
  const active = enabled && authenticated;

  const [state, setState] = useState<PrivateCallState>(INITIAL_CALL_STATE);
  // El estado al día, para decidir sin esperar un render
  const stateRef = useRef<PrivateCallState>(INITIAL_CALL_STATE);
  // Cuenta los cambios de estado: una reconciliación que llega después de un cambio puede ser vieja
  const versionRef = useRef(0);
  // La sala del último render, sin rehacer los callbacks (useVoiceRoom devuelve un objeto nuevo en cada uno)
  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  });
  // Llamada cuya sala pidió este hook (para cerrarla cuando la máquina sale de ella)
  const joinedRef = useRef<string | null>(null);
  const reconcileSeqRef = useRef(0);
  const eventQueueRef = useRef<Promise<void>>(Promise.resolve());
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());

  const dispatch = useCallback((action: CallAction): PrivateCallState => {
    const prev = stateRef.current;
    const next = callReducer(prev, action);
    if (next === prev) return prev;
    stateRef.current = next;
    versionRef.current += 1;
    setState(next);
    // Salió de la llamada (cortó alguno, venció, se rechazó): cerrar su sala
    const joined = joinedRef.current;
    if (joined && !holdsRoom(next, joined)) {
      joinedRef.current = null;
      roomRef.current.leave().catch(logError('Error al salir de la sala'));
    }
    return next;
  }, []);

  const later = useCallback((ms: number, fn: () => void) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      fn();
    }, ms);
    timersRef.current.add(timer);
  }, []);

  /** El rol en `call`, con la conversación del caché (o pidiéndola una vez). null si no es una conocida. */
  const resolveRole = useCallback(
    async (call: Call): Promise<CallRole | null> => {
      const find = () =>
        queryClient.getQueryData<Conversation[]>(conversationsQueryKey)?.find((c) => c.id === call.conversationId);
      let conversation = find();
      if (!conversation) {
        const current = stateRef.current;
        // La propia llamada que se está iniciando, en una conversación que todavía no está en el caché
        if (current.status === 'outgoing' && current.conversationId === call.conversationId) return 'caller';
        await queryClient
          .fetchQuery({ queryKey: conversationsQueryKey, queryFn: getConversations, staleTime: 0 })
          .catch(logError('No se pudieron pedir las conversaciones'));
        conversation = find();
      }
      return conversation ? callRoleFor(call, conversation.otherUserId) : null;
    },
    [queryClient]
  );

  const reconcile = useCallback(() => {
    reconcileSeqRef.current += 1;
    const seq = reconcileSeqRef.current;
    const version = versionRef.current;
    getCurrentCall()
      .then(async (call) => {
        const role = call ? await resolveRole(call) : null;
        // Llegó otra respuesta más nueva, o algo cambió el estado mientras tanto
        if (seq !== reconcileSeqRef.current || version !== versionRef.current) return;
        dispatch({ type: 'RECONCILED', call, role });
      })
      .catch(logError('No se pudo recuperar la llamada'));
  }, [dispatch, resolveRole]);

  /** La salida de la sala de `callId` (la llama useVoiceRoom una sola vez por sala). */
  const onRoomLeft = useCallback(
    (callId: string) => async (reason?: VoiceDisconnectReason) => {
      if (joinedRef.current === callId) joinedRef.current = null;
      // La cerró la máquina (cortó alguno, venció): no hay nada que avisar
      if (!holdsRoom(stateRef.current, callId)) return;
      if (reason) {
        // Se cerró sola: Voice suele avisar el motivo real enseguida
        later(CALL_ROOM_CLOSED_GRACE_MS, () => dispatch({ type: 'ROOM_CLOSED', callId }));
      } else {
        // Salió de la sala sin cortar (entró a un canal de voz): para el otro, la llamada termina
        dispatch({ type: 'ROOM_CLOSED', callId });
      }
      await endCall(callId).catch(logError('Error al cortar la llamada'));
    },
    [dispatch, later]
  );

  const enterRoom = useCallback(
    async (response: CallJoinResponse): Promise<VoiceJoinResult> => {
      const callId = response.call.id;
      if (!holdsRoom(stateRef.current, callId)) {
        // Se cortó mientras se pedía (colgó, o llegó el fin): que no quede abierta en el backend
        endCall(callId).catch(logError('Error al cortar la llamada'));
        return { microphoneAvailable: true };
      }
      // El mock no tiene LiveKit: la llamada se sigue igual, sin audio
      if (getApiMock()) return { microphoneAvailable: true };

      joinedRef.current = callId;
      try {
        return await roomRef.current.join(callRoomId(callId), {
          credentials: async () => credentialsOf(response),
          onLeave: onRoomLeft(callId),
        });
      } catch (err) {
        if (joinedRef.current === callId) joinedRef.current = null;
        dispatch({ type: 'JOIN_FAILED', callId });
        endCall(callId).catch(logError('Error al cortar la llamada'));
        throw err;
      }
    },
    [dispatch, onRoomLeft]
  );

  /** Llama desde la conversación. Rechaza con el ApiError de Voice (ver callErrorMessage). */
  const start = useCallback(
    async (conversationId: string): Promise<VoiceJoinResult> => {
      if (isOpen(stateRef.current)) throw new Error('Ya hay una llamada en curso.');
      dispatch({ type: 'START_REQUESTED', conversationId });
      let response: CallJoinResponse;
      try {
        response = await startCall(conversationId);
      } catch (err) {
        dispatch({ type: 'START_FAILED', conversationId });
        throw err;
      }
      dispatch({ type: 'START_SUCCEEDED', call: response.call });
      return enterRoom(response);
    },
    [dispatch, enterRoom]
  );

  /** Atiende la llamada entrante. Rechaza con el ApiError de Voice (ver callErrorMessage). */
  const accept = useCallback(async (): Promise<VoiceJoinResult> => {
    const current = stateRef.current;
    if (current.status !== 'incoming' || current.accepting) return { microphoneAvailable: true };
    const callId = current.call.id;
    dispatch({ type: 'ACCEPT_REQUESTED', callId });
    let response: CallJoinResponse;
    try {
      response = await acceptCall(callId);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      // 403: un bloqueo entre el timbre y el aceptar; Voice ya la terminó como unavailable
      dispatch({ type: 'ACCEPT_FAILED', callId, reason: status === 403 ? 'unavailable' : undefined });
      // 404 / 409: ya no suena (la atendió otro dispositivo, o terminó): el backend dice cómo sigue
      if (status === 404 || status === 409) reconcile();
      throw err;
    }
    dispatch({ type: 'ACCEPT_SUCCEEDED', call: response.call });
    return enterRoom(response);
  }, [dispatch, enterRoom, reconcile]);

  /** Rechaza la llamada entrante. Deja de sonar ya; si el pedido falla, sigue sonando para quien llama. */
  const decline = useCallback(async () => {
    const current = stateRef.current;
    if (current.status !== 'incoming') return;
    const callId = current.call.id;
    dispatch({ type: 'DECLINE_REQUESTED', callId });
    await declineCall(callId).catch(logError('Error al rechazar la llamada'));
  }, [dispatch]);

  /** Corta: cancela la que suena, termina la activa, o rechaza la entrante. */
  const hangUp = useCallback(async () => {
    const current = stateRef.current;
    if (current.status === 'incoming') return decline();
    if (current.status !== 'outgoing' && current.status !== 'active') return;
    const callId = current.call?.id;
    dispatch({ type: 'HANG_UP_REQUESTED' });
    // Sin id todavía: start manda el end cuando responda POST /calls
    if (callId) await endCall(callId).catch(logError('Error al cortar la llamada'));
  }, [decline, dispatch]);

  /** Oculta el aviso de cómo terminó (ended → idle). */
  const dismiss = useCallback(() => {
    dispatch({ type: 'DISMISSED' });
  }, [dispatch]);

  // Eventos del inbox, en orden (resolver el rol puede pedir las conversaciones)
  useEffect(() => {
    if (!authenticated) return;
    const handle = async (event: CallInboxEvent) => {
      const role = await resolveRole(event.call);
      dispatch({ type: event.type, call: event.call, role });
    };
    return subscribeCallEvents({
      onEvent: (event) => {
        eventQueueRef.current = eventQueueRef.current.then(() => handle(event)).catch(logError('Error con un evento'));
      },
      onReconnect: reconcile,
    });
  }, [authenticated, dispatch, reconcile, resolveRole]);

  // Al montar, al iniciar sesión y al volver de segundo plano
  useEffect(() => {
    if (active) reconcile();
  }, [active, reconcile]);

  // Sin sesión no hay llamada
  useEffect(() => {
    if (!authenticated) dispatch({ type: 'RESET' });
  }, [authenticated, dispatch]);

  // Timeout local de respaldo: el backend no avisó que dejó de sonar
  useEffect(() => {
    const deadline = callLocalDeadline(state);
    if (deadline === null || (state.status !== 'outgoing' && state.status !== 'incoming') || !state.call) return;
    const callId = state.call.id;
    const role = state.role;
    const timer = setTimeout(() => {
      const next = dispatch({ type: 'TIMED_OUT', callId });
      if (role === 'caller' && next.status === 'ended' && next.reason === 'missed' && next.call.id === callId) {
        endCall(callId).catch(logError('Error al cortar la llamada'));
      }
    }, Math.max(0, deadline - Date.now()));
    return () => clearTimeout(timer);
  }, [dispatch, state]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  return { state, start, accept, decline, hangUp, dismiss };
}
