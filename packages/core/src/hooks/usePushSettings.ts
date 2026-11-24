import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getConversations } from '../api/conversations';
import {
  getPushSettings,
  getVapidPublicKey,
  parsePushData,
  pushDataToDestination,   setPushSettings,
  type PushSettings,
} from '../api/push';
import { useSession } from '../auth/session';
import type { NotificationDestination } from '../notifications/display';
import { conversationsQueryKey } from './inboxCache';

export const pushSettingsQueryKey = ['push-settings'] as const;
export const vapidPublicKeyQueryKey = ['push-vapid-public-key'] as const;

/**
 * El interruptor general de push del usuario (`pushEnabled`, default true). El cambio es optimista: si falla
 * vuelve a como estaba, re-pide y rechaza (la interfaz avisa).
 */
export function usePushSettings() {
  const status = useSession((s) => s.status);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: pushSettingsQueryKey,
    queryFn: getPushSettings,
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
  });
  const mutation = useMutation({
    mutationFn: (pushEnabled: boolean) => setPushSettings({ pushEnabled }),
    onMutate: async (pushEnabled) => {
      await queryClient.cancelQueries({ queryKey: pushSettingsQueryKey });
      const previous = queryClient.getQueryData<PushSettings>(pushSettingsQueryKey);
      queryClient.setQueryData<PushSettings>(pushSettingsQueryKey, { pushEnabled });
      return { previous };
    },
    onSuccess: (saved) => queryClient.setQueryData(pushSettingsQueryKey, saved),
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(pushSettingsQueryKey, context?.previous);
      void queryClient.invalidateQueries({ queryKey: pushSettingsQueryKey });
    },
  });

  return {
    /** Mientras carga se muestra prendido: es el default del backend. */
    pushEnabled: query.data?.pushEnabled ?? true,
    setPushEnabled: (pushEnabled: boolean) => mutation.mutateAsync(pushEnabled),
    isLoading: query.isPending,
    isSaving: mutation.isPending,
  };
}

/** Clave pública VAPID (web). null: push web apagado en el backend. No cambia mientras dura la sesión. */
export function useVapidPublicKey() {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: vapidPublicKeyQueryKey,
    queryFn: getVapidPublicKey,
    enabled: status === 'authenticated',
    staleTime: Infinity,
  });
}

/**
 * Destino de un push tocado. Para un DM busca al otro participante en las conversaciones (del caché, o las
 * pide si no están: con la app cerrada todavía no se cargaron). null si no se puede resolver.
 */
export async function resolvePushDestination(
  queryClient: QueryClient,
  raw: unknown
): Promise<NotificationDestination | null> {
  const data = parsePushData(raw);
  if (!data) return null;
  if (data.serverId) return pushDataToDestination(data, []);
  const cached = queryClient.getQueryData<Awaited<ReturnType<typeof getConversations>>>(conversationsQueryKey);
  const fromCache = pushDataToDestination(data, cached);
  if (fromCache) return fromCache;
  try {
    const fresh = await getConversations();
    queryClient.setQueryData(conversationsQueryKey, fresh);
    return pushDataToDestination(data, fresh);
  } catch {
    return null;
  }
}
