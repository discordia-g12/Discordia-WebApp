import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import {
  getNotificationPreferences,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  setNotificationPreference,
  type NotificationLevel,
  type NotificationPage,
  type NotificationPreference,
  type NotificationPreferenceChange,
  type NotificationScopeType,
} from '../api/notifications';
import { useSession } from '../auth/session';
import {
  defaultNotificationLevel,
  isPreferenceMuted,
  resolveNotificationPreference,
  type ResolvedNotificationPreference,
} from '../notifications/preferences';

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
    onMutate: async (id) => {
      // Un refetch en vuelo (foco, intervalo) traería el aviso sin leer y pisaría el cambio optimista
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      queryClient.setQueryData<NotificationPages>(notificationsQueryKey, (old) => markReadInCache(old, new Set([id])));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
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
  return pref ? isPreferenceMuted(pref, now) : false;
}

interface SavePreferenceVariables {
  scopeType: NotificationScopeType;
  scopeId: string;
  serverId: string | null;
  change: Omit<NotificationPreferenceChange, 'serverId'>;
}

const sameScope = (a: Pick<NotificationPreference, 'scopeType' | 'scopeId'>, b: typeof a) =>
  a.scopeType === b.scopeType && a.scopeId === b.scopeId;

function upsertPreference(old: NotificationPreference[] = [], pref: NotificationPreference) {
  return old.some((p) => sameScope(p, pref)) ? old.map((p) => (sameScope(p, pref) ? pref : p)) : [...old, pref];
}

/**
 * Guarda una preferencia (solo los campos de `change`). Optimista: el caché cambia ya; si falla vuelve a como
 * estaba, re-pide las preferencias y rechaza (la interfaz avisa).
 */
function useSaveNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scopeType, scopeId, serverId, change }: SavePreferenceVariables) =>
      setNotificationPreference(scopeType, scopeId, { ...change, ...(serverId ? { serverId } : {}) }),
    onMutate: async ({ scopeType, scopeId, serverId, change }) => {
      // Un refetch en vuelo traería la preferencia vieja y pisaría el cambio optimista
      await queryClient.cancelQueries({ queryKey: notificationPreferencesQueryKey });
      const previous = queryClient.getQueryData<NotificationPreference[]>(notificationPreferencesQueryKey);
      const existing = previous?.find((p) => sameScope(p, { scopeType, scopeId }));
      const updated: NotificationPreference = {
        scopeType,
        scopeId,
        serverId,
        level: null,
        muted: false,
        mutedUntil: null,
        ...existing,
        ...change,
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData<NotificationPreference[]>(notificationPreferencesQueryKey, (old) =>
        upsertPreference(old, updated)
      );
      return { previous };
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<NotificationPreference[]>(notificationPreferencesQueryKey, (old) =>
        upsertPreference(old, saved)
      );
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(notificationPreferencesQueryKey, context?.previous);
      void queryClient.invalidateQueries({ queryKey: notificationPreferencesQueryKey });
    },
  });
}

/**
 * Silenciar o reactivar los avisos de un hilo, sin fecha de fin (`mutedUntil: null`): el nivel elegido queda
 * como estaba.
 */
export function useThreadMute(threadId: string | null, serverId: string | null) {
  const { data: prefs } = useNotificationPreferencesQuery();
  const muted = threadId ? isThreadMuted(prefs, threadId) : false;
  const mutation = useSaveNotificationPreference();

  const setMuted = (next: boolean) =>
    // El botón silencia sin fecha de fin: un mutedUntil vencido de antes dejaría el hilo sin silenciar
    mutation.mutateAsync({
      scopeType: 'thread',
      scopeId: threadId as string,
      serverId,
      change: { muted: next, mutedUntil: null },
    });

  return { muted, setMuted, isSaving: mutation.isPending };
}

/** De qué alcance es la preferencia. Un DM es `channel` con `serverId` null y `channelId` `dm-…`. */
export type NotificationPreferenceTarget =
  | { scopeType: 'server'; serverId: string }
  | { scopeType: 'channel'; serverId: string | null; channelId: string }
  | { scopeType: 'thread'; serverId: string | null; channelId: string; threadId: string };

function targetScopeId(target: NotificationPreferenceTarget): string {
  if (target.scopeType === 'server') return target.serverId;
  return target.scopeType === 'channel' ? target.channelId : target.threadId;
}

/** El alcance de arriba: lo que se hereda si este no tiene nivel propio. */
function parentScope(target: NotificationPreferenceTarget) {
  if (target.scopeType === 'thread') return { serverId: target.serverId, channelId: target.channelId };
  return { serverId: target.serverId };
}

export interface NotificationPreferenceState {
  /** La fila de este alcance, si el usuario guardó una. */
  preference: NotificationPreference | undefined;
  /** Nivel propio; null hereda. */
  level: NotificationLevel | null;
  /** Silencio propio vigente (no cuenta el de arriba: ese está en `inherited.muted`). */
  muted: boolean;
  mutedUntil: string | null;
  /** Lo que vale de verdad, con la cadena completa (lo que decide el backend). */
  effective: ResolvedNotificationPreference;
  /** Lo que daría `level: null`: para "Heredado: Solo menciones". */
  inherited: ResolvedNotificationPreference;
  /** null vuelve a heredar. */
  setLevel: (level: NotificationLevel | null) => Promise<NotificationPreference>;
  /** Sin `mutedUntil` (o null), sin fecha de fin. */
  setMuted: (muted: boolean, mutedUntil?: string | null) => Promise<NotificationPreference>;
  isLoading: boolean;
  isSaving: boolean;
}

/**
 * Nivel y silencio de un servidor, canal, DM o hilo, con lo efectivo y lo heredado resueltos como en el
 * backend. Los cambios son optimistas con vuelta atrás si fallan.
 */
export function useNotificationPreference(target: NotificationPreferenceTarget): NotificationPreferenceState {
  const { data: prefs, isPending } = useNotificationPreferencesQuery();
  const mutation = useSaveNotificationPreference();
  const scopeId = targetScopeId(target);
  const preference = prefs?.find((p) => p.scopeType === target.scopeType && p.scopeId === scopeId);
  const now = new Date();

  const save = (change: SavePreferenceVariables['change']) =>
    mutation.mutateAsync({ scopeType: target.scopeType, scopeId, serverId: target.serverId, change });

  return {
    preference,
    level: preference?.level ?? null,
    muted: preference ? isPreferenceMuted(preference, now) : false,
    mutedUntil: preference?.mutedUntil ?? null,
    effective: resolveNotificationPreference(prefs, target, now),
    // Un servidor no tiene nada arriba: heredar es el default
    inherited:
      target.scopeType === 'server'
        ? { level: defaultNotificationLevel(target), muted: false }
        : resolveNotificationPreference(prefs, parentScope(target), now),
    setLevel: (level) => save({ level }),
    setMuted: (muted, mutedUntil = null) => save({ muted, mutedUntil }),
    isLoading: isPending,
    isSaving: mutation.isPending,
  };
}
