import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createRole,
  deleteRole,
  getRoles,
  updateRolePermissions,
  type CreateRoleRequest,
} from '../api/roles'
import type { ServerRole } from '../types'

export function useRolesQuery(serverId: string | null) {
  return useQuery({
    queryKey: ['roles', serverId],
    queryFn: () => getRoles(serverId as string),
    enabled: Boolean(serverId),
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
    mutationFn: ({ roleId, permissionsBitmask }: { roleId: string; permissionsBitmask: number }) =>
      updateRolePermissions(serverId, roleId, permissionsBitmask),
    onSuccess: updated => {
      queryClient.setQueryData<ServerRole[]>(['roles', serverId], old =>
        old?.map(r => (r.id === updated.id ? updated : r)),
      )
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
