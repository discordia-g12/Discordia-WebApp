import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/session';
import { getMyStatus, setMyStatus, type PreferredStatus } from '../api/presence';

export const myStatusQueryKey = ['presence', 'me'] as const;

/**
 * Estado elegido por el propio usuario (Chat-Engine lo guarda entre sesiones). Se pide una vez por sesión:
 * después solo lo cambia useSetMyStatusMutation.
 */
export function useMyStatusQuery() {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: myStatusQueryKey,
    queryFn: getMyStatus,
    enabled: status === 'authenticated',
    staleTime: Infinity,
  });
}

/** Cambia el estado elegido. Se ve al instante y, si el backend no lo guarda, vuelve al anterior. */
export function useSetMyStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: PreferredStatus) => setMyStatus(status),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: myStatusQueryKey });
      const previous = queryClient.getQueryData<PreferredStatus>(myStatusQueryKey);
      queryClient.setQueryData(myStatusQueryKey, status);
      return { previous };
    },
    onError: (_err, _status, context) => {
      // Sin valor anterior (todavía no había cargado), setQueryData(undefined) no hace nada: se vuelve a pedir
      if (context?.previous === undefined) {
        void queryClient.invalidateQueries({ queryKey: myStatusQueryKey });
      } else {
        queryClient.setQueryData(myStatusQueryKey, context.previous);
      }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(myStatusQueryKey, saved);
    },
  });
}
