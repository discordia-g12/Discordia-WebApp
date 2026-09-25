import { api } from './client';
import { Role, RoleBackendResponse } from '../types';

export interface CreateRoleRequest {
  name: string;
  color?: string;
}

export const DEFAULT_ROLE_COLOR = '#99aab5';

/**
 * Posición del bit de cada permiso dentro del bitmask del backend
 * (Server-Roles-Core-Service, core/permissions.py). Los ids son los que usa la UI:
 * CREATE_INSTANT_INVITE es CREATE_INVITE en el backend. VIEW_AUDIT_LOG y STREAM
 * todavía no tienen bit en el backend, por lo que nunca aparecen habilitados.
 */
export const PERMISSION_BITS: Record<string, number> = {
  VIEW_CHANNELS: 0,
  MANAGE_CHANNELS: 1,
  MANAGE_ROLES: 2,
  MANAGE_SERVER: 3,
  KICK_MEMBERS: 4,
  BAN_MEMBERS: 5,
  CREATE_INSTANT_INVITE: 6,
  CHANGE_NICKNAME: 7,
  MANAGE_NICKNAMES: 8,
  SEND_MESSAGES: 9,
  MANAGE_MESSAGES: 10,
  EMBED_LINKS: 11,
  ATTACH_FILES: 12,
  ADD_REACTIONS: 13,
  MENTION_EVERYONE: 14,
  CONNECT: 15,
  SPEAK: 16,
  MUTE_MEMBERS: 17,
  DEAFEN_MEMBERS: 18,
  MOVE_MEMBERS: 19,
  ADMINISTRATOR: 20,
};

/** Convierte el bitmask del backend en la lista de ids de permisos que usa la UI. */
export function bitmaskToPermissions(bitmask: number): string[] {
  return Object.entries(PERMISSION_BITS)
    .filter(([, bit]) => ((bitmask >> bit) & 1) === 1)
    .map(([name]) => name);
}

/** Convierte la lista de ids de permisos de la UI en el bitmask del backend. Ignora ids sin bit. */
export function permissionsToBitmask(permissions: string[]): number {
  return permissions.reduce((mask, id) => {
    const bit = PERMISSION_BITS[id];
    return bit === undefined ? mask : mask | (1 << bit);
  }, 0);
}

/**
 * Adaptador: Convierte un rol del backend (snake_case) al modelo de dominio (camelCase).
 */
export function mapRoleFromBackend(raw: RoleBackendResponse): Role {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color || DEFAULT_ROLE_COLOR,
    position: raw.position,
    permissions: bitmaskToPermissions(raw.permissions_bitmask),
    isDefault: raw.is_default,
  };
}

/**
 * Consulta los roles de un servidor, ordenados por posición.
 */
export async function getRoles(serverId: string): Promise<Role[]> {
  const raw = await api.get<RoleBackendResponse[]>(`/api/v1/servers/${serverId}/roles`);
  return (raw || []).map(mapRoleFromBackend);
}

/**
 * Crea un rol en un servidor. El backend lo crea con los permisos por defecto.
 */
export async function createRole(serverId: string, payload: CreateRoleRequest): Promise<Role> {
  const raw = await api.post<RoleBackendResponse>(`/api/v1/servers/${serverId}/roles`, {
    name: payload.name.trim(),
    color: payload.color ?? null,
  });
  return mapRoleFromBackend(raw);
}

/**
 * Reemplaza los permisos de un rol. El backend rechaza (403) quitar ADMINISTRATOR del propio rol.
 */
export async function updateRolePermissions(
  serverId: string,
  roleId: string,
  permissions: string[]
): Promise<Role> {
  const raw = await api.patch<RoleBackendResponse>(
    `/api/v1/servers/${serverId}/roles/${roleId}/permissions`,
    { new_permissions_bitmask: permissionsToBitmask(permissions) }
  );
  return mapRoleFromBackend(raw);
}

/**
 * Elimina un rol de un servidor. El backend rechaza borrar el rol por defecto (400).
 */
export async function deleteRole(serverId: string, roleId: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}/roles/${roleId}`);
}
