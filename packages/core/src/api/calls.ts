import { api } from './client';
import { getApiMock } from './mock';
import type { VoiceJoinResponse } from './voice';

/** ringing: sonando (30 s). active: los dos en la sala. ended: terminó, con motivo en `endReason`. */
export type CallStatus = 'ringing' | 'active' | 'ended';

/**
 * Cómo terminó una llamada. declined: quien recibe la rechazó. missed: nadie atendió. canceled: quien llama
 * cortó antes de que atiendan. ended: se cortó estando activa. unavailable: no se pudo seguir (bloqueo o
 * cuenta suspendida); nunca se dice cuál.
 */
export type CallEndReason = 'declined' | 'missed' | 'canceled' | 'ended' | 'unavailable';

/**
 * Llamada privada 1 a 1, la misma para los dos (no trae el rol). Los ids son canónicos: el rol se deduce
 * comparando con el `otherUserId` de la conversación (ver callRoleFor), no con el `sub` propio.
 */
export interface Call {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  status: CallStatus;
  endReason?: CallEndReason;
  /** Fechas en ISO 8601. `expiresAt`: cuándo deja de sonar. */
  createdAt: string;
  expiresAt: string;
  answeredAt?: string;
  endedAt?: string;
}

/** Iniciar o aceptar: la llamada y las credenciales de su sala de LiveKit (micrófono y cámara). */
export interface CallJoinResponse extends VoiceJoinResponse {
  call: Call;
}

/** Sala de LiveKit de una llamada. */
export function callRoomId(callId: string): string {
  return `call-${callId}`;
}

/**
 * Llama desde una conversación directa; quien llama entra a la sala ya. Rechaza con 403 DM_NOT_DELIVERABLE
 * o DM_PENDING (mismas reglas que escribir), 404 CONVERSATION_NOT_FOUND y 409 CALL_BUSY (ver callErrorMessage).
 */
export async function startCall(conversationId: string): Promise<CallJoinResponse> {
  const mock = getApiMock();
  if (mock?.startCall) return mock.startCall(conversationId);

  return api.post<CallJoinResponse>('/api/v1/voice/calls', { conversationId });
}

/** Atiende. Solo quien recibe y solo mientras suena (409 CALL_NOT_RINGING). */
export async function acceptCall(callId: string): Promise<CallJoinResponse> {
  const mock = getApiMock();
  if (mock?.acceptCall) return mock.acceptCall(callId);

  return api.post<CallJoinResponse>(`/api/v1/voice/calls/${encodeURIComponent(callId)}/accept`);
}

/** Rechaza. Solo quien recibe y solo mientras suena. */
export async function declineCall(callId: string): Promise<void> {
  const mock = getApiMock();
  if (mock?.declineCall) return mock.declineCall(callId);

  await api.post<void>(`/api/v1/voice/calls/${encodeURIComponent(callId)}/decline`);
}

/** Corta (cualquiera de los dos). Idempotente: una llamada ya terminada responde igual. */
export async function endCall(callId: string): Promise<void> {
  const mock = getApiMock();
  if (mock?.endCall) return mock.endCall(callId);

  await api.post<void>(`/api/v1/voice/calls/${encodeURIComponent(callId)}/end`);
}

/** La llamada sonando o activa del usuario, o null. Para recuperar el estado al reconectar. */
export async function getCurrentCall(): Promise<Call | null> {
  const mock = getApiMock();
  if (mock?.getCurrentCall) return mock.getCurrentCall();

  const response = await api.get<{ call: Call | null }>('/api/v1/voice/calls/current');
  return response?.call ?? null;
}
