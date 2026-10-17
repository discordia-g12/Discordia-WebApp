import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignRoleToMember,
  bitmaskToPermissions,
  createRole,
  deleteRole,
  getRoleMembers,
  getRoles,
  permissionsToBitmask,
  removeRoleFromMember,
  setDefaultRole,
  updateRoleInfo,
  updateRolePermissions,
  type CreateRoleRequest,
  type UpdateRoleInfoRequest,
} from '@shared/api/roles'
import type { Role } from '@shared/types'
import type { ServerRole } from '../types'

// La API compartida modela los permisos como lista de ids; la UI mobile trabaja con el bitmask del backend
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
    queryKey: ['roles', serverId],
    queryFn: async () => (await getRoles(serverId as string)).map(toServerRole),
    enabled: Boolean(serverId),
  })
}

export function useRoleMembersQuery(serverId: string | null, roleId: string | null) {
  return useQuery({
    queryKey: ['role-members', serverId, roleId],
    queryFn: () => getRoleMembers(serverId as string, roleId as string),
    enabled: Boolean(serverId) && Boolean(roleId),
  })
}

export function useAssignRoleMutation(serverId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      assignRoleToMember(serverId, roleId, userId),
    onSuccess: (_data, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-members', serverId] })
      queryClient.invalidateQueries({ queryKey: ['role-members', serverId, roleId] })
    },
  })
}

export function useRemoveRoleMutation(serverId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      removeRoleFromMember(serverId, roleId, userId),
    onSuccess: (_data, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-members', serverId] })
      queryClient.invalidateQueries({ queryKey: ['role-members', serverId, roleId] })
    },
  })
}

export function useCreateRoleMutation(serverId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateRoleRequest) => createRole(serverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] })
    },
  })
}

export function useUpdateRolePermissionsMutation(serverId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ roleId, permissionsBitmask }: { roleId: string; permissionsBitmask: number }) =>
      toServerRole(await updateRolePermissions(serverId, roleId, bitmaskToPermissions(permissionsBitmask))),
    onSuccess: updated => {
      queryClient.setQueryData<ServerRole[]>(['roles', serverId], old =>
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
      queryClient.setQueryData<ServerRole[]>(['roles', serverId], old =>
        old?.map(r => (r.id === updated.id ? updated : r)),
      )
    },
  })
}

export function useSetDefaultRoleMutation(serverId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => setDefaultRole(serverId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] })
    },
  })
}

export function useDeleteRoleMutation(serverId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => deleteRole(serverId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', serverId] })
    },
  })
}
