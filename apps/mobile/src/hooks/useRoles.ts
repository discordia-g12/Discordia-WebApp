import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bitmaskToPermissions,
  getRoles,
  permissionsToBitmask,
  updateRoleInfo,
  updateRolePermissions,
  type Role,
  type UpdateRoleInfoRequest,
} from '@discordia/core'
import type { ServerRole } from '../types'

/**
 * Roles en el modelo de la UI mobile, que trabaja con el bitmask del backend; core (y la web) modela
 * los permisos como lista de ids. El resto de los hooks de roles (miembros, asignar, crear, borrar,
 * rol por defecto) son los de @discordia/core. Se unifica al rehacer las pantallas de mobile (paso 13).
 *
 * Clave de caché propia: ['roles', serverId] guarda Role[] (core). Las invalidaciones de core sobre
 * ['roles', serverId] también refrescan esta, porque comparte el prefijo.
 */
const rolesKey = (serverId: string | null) => ['roles', serverId, 'bitmask']

function toServerRole(role: Role): ServerRole {
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    position: role.position ?? 0,
    permissionsBitmask: permissionsToBitmask(role.permissions),
    isDefault: role.isDefault ?? false,
  }
}

export function useRolesQuery(serverId: string | null) {
  return useQuery({
    queryKey: rolesKey(serverId),
    queryFn: async () => (await getRoles(serverId as string)).map(toServerRole),
    enabled: Boolean(serverId),
  })
}

export function useUpdateRolePermissionsMutation(serverId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ roleId, permissionsBitmask }: { roleId: string; permissionsBitmask: number }) =>
      toServerRole(await updateRolePermissions(serverId, roleId, bitmaskToPermissions(permissionsBitmask))),
    onSuccess: updated => {
      queryClient.setQueryData<ServerRole[]>(rolesKey(serverId), old =>
        old?.map(r => (r.id === updated.id ? updated : r)),
      )
    },
  })
}

export function useUpdateRoleInfoMutation(serverId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ roleId, payload }: { roleId: string; payload: UpdateRoleInfoRequest }) =>
      toServerRole(await updateRoleInfo(serverId, roleId, payload)),
    onSuccess: updated => {
      queryClient.setQueryData<ServerRole[]>(rolesKey(serverId), old =>
        old?.map(r => (r.id === updated.id ? updated : r)),
      )
    },
  })
}
