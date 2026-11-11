import { api } from './client';
import { Role, RoleBackendResponse, RoleMember, RoleMemberBackendResponse } from '../types';

export interface CreateRoleRequest {
  name: string;
  color?: string;
}

export const DEFAULT_ROLE_COLOR = '#99aab5';

/**
 * Posición del bit de cada permiso dentro del bitmask del backend
 * (Server-Roles-Core-Service, core/permissions.py). Los ids son los que usa la UI:
 * CREATE_INSTANT_INVITE es CREATE_INVITE en el backend.
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
  VIDEO: 21,
  SCREEN_SHARE: 22,
  VIEW_AUDIT_LOG: 23,
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
 * Adaptador: Convierte un miembro de rol del backend (snake_case) al modelo de dominio (camelCase).
 */
export function mapRoleMemberFromBackend(raw: RoleMemberBackendResponse): RoleMember {
  return {
    id: raw.id,
    userId: raw.user_id,
    nickname: raw.nickname,
    joinedAt: raw.joined_at,
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
 * Consulta los miembros que tienen asignado un rol. Requiere permisos para gestionar roles.
 */
export async function getRoleMembers(serverId: string, roleId: string): Promise<RoleMember[]> {
  const raw = await api.get<RoleMemberBackendResponse[]>(`/api/v1/servers/${serverId}/roles/${roleId}/members`);
  return (raw || []).map(mapRoleMemberFromBackend);
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
 * Define un rol como el rol por defecto del servidor. El rol que lo era antes deja de serlo.
 */
export async function setDefaultRole(serverId: string, roleId: string): Promise<Role> {
  const raw = await api.patch<RoleBackendResponse>(`/api/v1/servers/${serverId}/roles/${roleId}/default`);
  return mapRoleFromBackend(raw);
}

export interface UpdateRoleInfoRequest {
  name?: string;
  color?: string;
}

/**
 * Edita el nombre y/o color de un rol. El backend rechaza (400) renombrar el rol por defecto.
 */
export async function updateRoleInfo(
  serverId: string,
  roleId: string,
  payload: UpdateRoleInfoRequest
): Promise<Role> {
  const raw = await api.patch<RoleBackendResponse>(`/api/v1/servers/${serverId}/roles/${roleId}`, {
    ...(payload.name !== undefined && { name: payload.name.trim() }),
    ...(payload.color !== undefined && { color: payload.color }),
  });
  return mapRoleFromBackend(raw);
}

/**
 * Asigna un rol a un miembro del servidor. Requiere permisos para gestionar roles.
 */
export async function assignRoleToMember(serverId: string, roleId: string, userId: string): Promise<void> {
  await api.put(`/api/v1/servers/${serverId}/roles/${roleId}/members/${encodeURIComponent(userId)}`);
}

/**
 * Quita un rol a un miembro del servidor. El backend responde 404 si el miembro no lo tenía.
 */
export async function removeRoleFromMember(serverId: string, roleId: string, userId: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}/roles/${roleId}/members/${encodeURIComponent(userId)}`);
}

/**
 * Elimina un rol de un servidor. El backend rechaza borrar el rol por defecto (400).
 */
export async function deleteRole(serverId: string, roleId: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}/roles/${roleId}`);
}

/**
 * Reordena los roles de un servidor según la lista de roleIds (de menor a mayor posición).
 */
export async function reorderRoles(serverId: string, roleIds: string[]): Promise<Role[]> {
  const raw = await api.put<RoleBackendResponse[]>(`/api/v1/servers/${serverId}/roles/order`, {
    role_ids: roleIds,
  });
  return (raw || []).map(mapRoleFromBackend);
}
