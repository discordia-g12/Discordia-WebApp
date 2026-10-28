import { api } from './client';

/** Qué puede publicar el usuario en la llamada, según sus roles (el token de LiveKit solo deja eso). */
export interface VoicePublishPermissions {
  canSpeak: boolean;
  canVideo: boolean;
  canScreenShare: boolean;
}

export interface VoiceJoinResponse {
  /** JWT firmado por el voice-service para entrar a la sala de LiveKit. */
  token: string;
  /** URL pública del servidor LiveKit (el browser se conecta directo, no vía Gateway). */
  url: string;
  /** Sin el campo (voice-service anterior), puede publicar todo. */
  permissions?: VoicePublishPermissions;
}

/**
 * Registra al usuario en el canal de voz y obtiene las credenciales de LiveKit.
 * Si el usuario estaba en otro canal, el backend lo saca de ese.
 */
export async function joinVoiceChannel(channelId: string): Promise<VoiceJoinResponse> {
  return await api.post<VoiceJoinResponse>(`/api/v1/voice/rooms/${channelId}/join`);
}

/**
 * Saca al usuario del canal de voz en el que esté.
 */
export async function leaveVoiceChannel(): Promise<void> {
  await api.post(`/api/v1/voice/rooms/leave`);
}
