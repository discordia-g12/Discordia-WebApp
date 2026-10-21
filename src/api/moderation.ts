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
