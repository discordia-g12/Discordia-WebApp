import { apiFetch } from './client'
import type { ServerRole, RoleBackendResponse } from '../types'

export interface CreateRoleRequest {
  name: string
  color?: string
}

/**
 * Adaptador: Convierte un rol del backend (snake_case) al modelo de dominio (camelCase).
 */
export function mapRoleFromBackend(raw: RoleBackendResponse): ServerRole {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color,
    position: raw.position,
    permissionsBitmask: raw.permissions_bitmask,
    isDefault: raw.is_default,
  }
}

/**
 * Consulta la lista de roles de un servidor, ordenados por posición.
 */
export async function getRoles(serverId: string): Promise<ServerRole[]> {
  const raw = await apiFetch<RoleBackendResponse[]>(`/api/v1/servers/${serverId}/roles`)
  return (raw || []).map(mapRoleFromBackend)
}

/**
 * Crea un rol dentro de un servidor.
 */
export async function createRole(serverId: string, payload: CreateRoleRequest): Promise<ServerRole> {
  const raw = await apiFetch<RoleBackendResponse>(`/api/v1/servers/${serverId}/roles`, {
    method: 'POST',
    body: {
      name: payload.name.trim(),
      color: payload.color || null,
    },
  })
  return mapRoleFromBackend(raw)
}

/**
 * Elimina un rol de un servidor. El backend rechaza borrar el rol por defecto (400).
 */
export async function deleteRole(serverId: string, roleId: string): Promise<void> {
  await apiFetch(`/api/v1/servers/${serverId}/roles/${roleId}`, {
    method: 'DELETE',
  })
}
