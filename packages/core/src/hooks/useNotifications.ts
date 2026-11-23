import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import {
  getNotificationPreferences,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationPreference,
  type NotificationPage,
  type NotificationPreference,
} from '../api/notifications';
import { useSession } from '../auth/session';

export const notificationsQueryKey = ['notifications'] as const;
export const notificationPreferencesQueryKey = ['notification-preferences'] as const;

/** Respaldo si el aviso en vivo no llega (inbox caído): cada cuánto se vuelve a pedir la bandeja. */
export const NOTIFICATIONS_POLL_MS = 60_000;
export const NOTIFICATIONS_PAGE_SIZE = 20;

type NotificationPages = InfiniteData<NotificationPage, string | undefined>;

/**
 * Bandeja del usuario, de la más nueva a la más vieja (CA5 de hilos; centro de notificaciones de la épica).
 * Se mantiene al día con NOTIFICATION_CREATED por el inbox, al volver el foco y cada 60 s.
 */
export function useNotificationsQuery() {
  const status = useSession((s) => s.status);
  const query = useInfiniteQuery({
    queryKey: notificationsQueryKey,
    queryFn: ({ pageParam }) => getNotifications({ before: pageParam, limit: NOTIFICATIONS_PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: status === 'authenticated',
    refetchInterval: NOTIFICATIONS_POLL_MS,
    refetchOnWindowFocus: true,
  });

  const pages = query.data?.pages;
  const items = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);
  return {
    ...query,
    items,
    unreadCount: pages?.[0]?.unreadCount ?? 0,
    hasMore: query.hasNextPage,
    fetchMore: query.fetchNextPage,
  };
}

/** Marca leídos en el caché: los ids dados, o todos si no se pasan. Devuelve cuántos no leídos sacó. */
function markReadInCache(old: NotificationPages | undefined, ids?: Set<string>): NotificationPages | undefined {
  if (!old) return old;
  const now = new Date().toISOString();
  let marked = 0;
  const pages = old.pages.map((page) => ({
    ...page,
    items: page.items.map((n) => {
      if (n.readAt || (ids && !ids.has(n.id))) return n;
      marked += 1;
      return { ...n, readAt: now };
    }),
  }));
  return {
    ...old,
    pages: pages.map((page, i) =>
      i === 0 ? { ...page, unreadCount: ids ? Math.max(0, page.unreadCount - marked) : 0 } : page
    ),
  };
}

/** Marca un aviso leído al abrirlo. Optimista: el contador baja ya, y se corrige con la próxima lectura. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: (id) => {
      queryClient.setQueryData<NotificationPages>(notificationsQueryKey, (old) => markReadInCache(old, new Set([id])));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: () => {
      queryClient.setQueryData<NotificationPages>(notificationsQueryKey, (old) => markReadInCache(old));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });
}

export function useNotificationPreferencesQuery() {
  const status = useSession((s) => s.status);
  return useQuery({
    queryKey: notificationPreferencesQueryKey,
    queryFn: getNotificationPreferences,
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
  });
}

/** Si el usuario silenció este hilo (y el silencio sigue vigente). */
export function isThreadMuted(prefs: NotificationPreference[] | undefined, threadId: string, now = new Date()): boolean {
  const pref = prefs?.find((p) => p.scopeType === 'thread' && p.scopeId === threadId);
  if (!pref?.muted) return false;
  return pref.mutedUntil === null || new Date(pref.mutedUntil).getTime() > now.getTime();
}

/**
 * Silenciar o reactivar los avisos de un hilo. Solo cambia `muted`: el nivel elegido queda como estaba.
 * Optimista; si falla, vuelve a pedir las preferencias y rechaza (la interfaz avisa).
 */
export function useThreadMute(threadId: string | null, serverId: string | null) {
  const queryClient = useQueryClient();
  const { data: prefs } = useNotificationPreferencesQuery();
  const muted = threadId ? isThreadMuted(prefs, threadId) : false;

  const mutation = useMutation({
    mutationFn: (next: boolean) =>
      setNotificationPreference('thread', threadId as string, { muted: next, ...(serverId ? { serverId } : {}) }),
    onMutate: (next) => {
      queryClient.setQueryData<NotificationPreference[]>(notificationPreferencesQueryKey, (old = []) => {
        const existing = old.find((p) => p.scopeType === 'thread' && p.scopeId === threadId);
        const updated: NotificationPreference = {
          scopeType: 'thread',
          scopeId: threadId as string,
          serverId,
          level: existing?.level ?? null,
          mutedUntil: null,
          updatedAt: new Date().toISOString(),
          ...existing,
          muted: next,
        };
        return existing ? old.map((p) => (p === existing ? updated : p)) : [...old, updated];
      });
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<NotificationPreference[]>(notificationPreferencesQueryKey, (old = []) =>
        old.map((p) => (p.scopeType === saved.scopeType && p.scopeId === saved.scopeId ? saved : p))
      );
    },
    onError: () => queryClient.invalidateQueries({ queryKey: notificationPreferencesQueryKey }),
  });

  return { muted, setMuted: mutation.mutateAsync, isSaving: mutation.isPending };
}
