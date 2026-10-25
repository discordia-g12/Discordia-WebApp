import { api } from './client';
import { errorMessageFor } from './errors';
import type { ServerBan, ServerBanBackendResponse } from '../types';

/** Largo máximo del motivo de un baneo (igual que en Server-Roles-Core-Service). */
export const BAN_REASON_MAX_LENGTH = 500;

/**
 * Adaptador: Convierte un baneo del backend (snake_case) al modelo de dominio (camelCase).
 */
export function mapServerBanFromBackend(raw: ServerBanBackendResponse): ServerBan {
  return {
    id: raw.id,
    serverId: raw.server_id,
    userId: raw.user_id,
    bannedBy: raw.banned_by,
    reason: raw.reason,
    createdAt: raw.created_at,
  };
}

/**
 * Lista los usuarios baneados de un servidor (requiere BAN_MEMBERS).
 */
export async function getServerBans(serverId: string): Promise<ServerBan[]> {
  const raw = await api.get<ServerBanBackendResponse[]>(`/api/v1/servers/${serverId}/bans`);
  return (raw || []).map(mapServerBanFromBackend);
}

/**
 * Banea a un usuario del servidor (requiere BAN_MEMBERS y un rol más alto que el suyo).
 * El backend lo saca del servidor y le cierra el chat en vivo.
 */
export async function banMember(serverId: string, userId: string, reason?: string): Promise<ServerBan> {
  const trimmedReason = reason?.trim();
  const raw = await api.post<ServerBanBackendResponse>(`/api/v1/servers/${serverId}/bans`, {
    user_id: userId,
    reason: trimmedReason || undefined,
  });
  return mapServerBanFromBackend(raw);
}

/**
 * Revoca el baneo de un usuario (requiere BAN_MEMBERS). El usuario no vuelve a ser
 * miembro: puede volver a unirse con una invitación válida.
 */
export async function unbanMember(serverId: string, userId: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}/bans/${encodeURIComponent(userId)}`);
}

/** Mensaje para el usuario cuando falla un baneo (los `detail` del backend vienen en inglés). */
export function banErrorMessage(err: unknown): string {
  return errorMessageFor(
    err,
    {
      400: 'No podés banear al dueño del servidor ni a vos mismo.',
      403: 'No podés banear a este miembro: necesitás el permiso "Ban Members" y un rol más alto que el suyo.',
      404: 'El servidor no existe.',
      409: 'Ese usuario ya está baneado.',
      422: `El motivo no puede superar los ${BAN_REASON_MAX_LENGTH} caracteres.`,
    },
    'No se pudo banear al miembro.'
  );
}

/** Mensaje para el usuario cuando falla la revocación de un baneo. */
export function unbanErrorMessage(err: unknown): string {
  return errorMessageFor(
    err,
    {
      403: 'No tenés permiso para revocar baneos en este servidor.',
      404: 'Ese usuario ya no está baneado.',
    },
    'No se pudo revocar el baneo.'
  );
}

/** Duraciones de silencio que ofrece la interfaz (null: hasta que se quite). */
export const MUTE_DURATIONS: { seconds: number | null; label: string }[] = [
  { seconds: 15 * 60, label: '15 minutos' },
  { seconds: 60 * 60, label: '1 hora' },
  { seconds: 24 * 60 * 60, label: '24 horas' },
  { seconds: null, label: 'hasta quitarlo' },
];

/**
 * Expulsa a un miembro (requiere KICK_MEMBERS). A diferencia del baneo, puede volver a unirse con una
 * invitación. El motivo va como parámetro de la URL (el backend no recibe cuerpo en el DELETE).
 */
export async function kickMember(serverId: string, userId: string, reason?: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}/members/${encodeURIComponent(userId)}`, {
    query: { reason: reason?.trim() || undefined },
  });
}

/** Silencia a un miembro en el servidor (requiere MUTE_MEMBERS). Sin duración, hasta que se quite. */
export async function muteMember(serverId: string, userId: string, durationSeconds: number | null, reason?: string): Promise<void> {
  await api.post(`/api/v1/servers/${serverId}/mutes`, {
    user_id: userId,
    duration_seconds: durationSeconds ?? undefined,
    reason: reason?.trim() || undefined,
  });
}

/** Quita el silencio de un miembro (requiere MUTE_MEMBERS). */
export async function unmuteMember(serverId: string, userId: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}/mutes/${encodeURIComponent(userId)}`);
}

/** Mensaje para el usuario cuando falla una expulsión. */
export function kickErrorMessage(err: unknown): string {
  return errorMessageFor(
    err,
    {
      400: 'No podés expulsar al dueño del servidor ni a vos mismo.',
      403: 'Necesitás el permiso "Expulsar miembros" para hacer esto.',
      404: 'Esa persona ya no es miembro del servidor.',
    },
    'No se pudo expulsar al miembro.'
  );
}

/** Mensaje para el usuario cuando falla silenciar o quitar el silencio. */
export function muteErrorMessage(err: unknown): string {
  return errorMessageFor(
    err,
    {
      400: 'No podés silenciar al dueño del servidor ni a vos mismo.',
      403: 'Necesitás el permiso "Silenciar miembros" para hacer esto.',
      404: 'Esa persona no estaba silenciada.',
    },
    'No se pudo cambiar el silencio del miembro.'
  );
}
