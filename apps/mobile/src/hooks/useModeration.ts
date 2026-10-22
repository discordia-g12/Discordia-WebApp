import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { banMember, getServerBans, unbanMember } from '@discordia/core'

export function useServerBansQuery(serverId: string | null) {
  return useQuery({
    queryKey: ['server-bans', serverId],
    queryFn: () => getServerBans(serverId as string),
    enabled: Boolean(serverId),
  })
}

export function useBanMemberMutation(serverId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) => banMember(serverId, userId, reason),
    // El baneado deja de ser miembro y pasa a la lista de baneos
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-members', serverId] })
      queryClient.invalidateQueries({ queryKey: ['role-members', serverId] })
      queryClient.invalidateQueries({ queryKey: ['server-bans', serverId] })
    },
  })
}

export function useUnbanMemberMutation(serverId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => unbanMember(serverId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-bans', serverId] })
    },
  })
}
