import { useInfiniteQuery } from '@tanstack/react-query'
import { getServerMembers } from '@shared/api/servers'

export function useServerMembersQuery(serverId: string | null) {
  return useInfiniteQuery({
    queryKey: ['server-members', serverId],
    queryFn: ({ pageParam }) => getServerMembers(serverId as string, { offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: lastPage => {
      const loaded = lastPage.offset + lastPage.items.length
      return loaded < lastPage.total ? loaded : undefined
    },
    enabled: Boolean(serverId),
  })
}
