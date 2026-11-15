import { useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSession } from '../auth/session';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { ApiError } from '../api/errors';
import { getServerAuditLogs } from './api';
import type { AuditCategory, AuditLogEntry } from './types';

export function isAuditForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

export function auditErrorMessage(error: unknown): string {
  if (isAuditForbidden(error)) {
    return 'No tienes permisos de moderación para ver el registro de auditoría de este servidor.';
  }
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión no es válida o expiró.';
    if (error.detail) return error.detail;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'No se pudo cargar el registro de auditoría.';
}

export interface UseServerAuditLogsOptions {
  limit?: number;
  initialCategory?: AuditCategory | 'all';
  initialActorId?: string | null;
}

/**
 * Hook para consultar y navegar el registro de auditoría de moderación de un servidor.
 * Administra el filtro por categoría, búsqueda/filtro por actor/usuario,
 * la paginación con cursor y la resolución de perfiles para los avatares y nombres.
 */
export function useServerAuditLogs(serverId: string | null, options: UseServerAuditLogsOptions = {}) {
  const { limit = 50, initialCategory = 'all', initialActorId = null } = options;
  const status = useSession((s) => s.status);
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | 'all'>(initialCategory);
  const [actorIdFilter, setActorIdFilter] = useState<string | null>(initialActorId);
  const [actorSearch, setActorSearch] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['server-audit-logs', serverId, categoryFilter, actorIdFilter],
    queryFn: ({ pageParam }) =>
      getServerAuditLogs(serverId as string, {
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        actorId: actorIdFilter || undefined,
        before: pageParam as string | undefined,
        limit,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined),
    enabled: status === 'authenticated' && Boolean(serverId),
    retry: (failureCount, error) => {
      if (isAuditForbidden(error)) return false;
      return failureCount < 2;
    },
  });

  const rawEntries: AuditLogEntry[] = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data]
  );

  // Recolectar IDs de usuarios involucrados para resolver sus perfiles (avatar, nick, display name)
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of rawEntries) {
      if (entry.actorId) ids.add(entry.actorId);
      if (
        entry.targetId &&
        (entry.category === 'members' ||
          entry.action.startsWith('MEMBER_') ||
          entry.action === 'MESSAGE_DELETE' ||
          entry.action === 'SERVER_TRANSFER')
      ) {
        ids.add(entry.targetId);
      }
    }
    return Array.from(ids);
  }, [rawEntries]);

  const profiles = useUserProfiles(userIds);

  // Filtrado de las acciones por búsqueda de usuario (nombre, username o ID del actor)
  const entries: AuditLogEntry[] = useMemo(() => {
    const q = actorSearch.trim().toLowerCase();
    if (!q) return rawEntries;
    return rawEntries.filter((entry) => {
      const profile = profiles[entry.actorId];
      const name = profile?.displayName?.toLowerCase() || '';
      const username = profile?.username?.toLowerCase() || '';
      const id = entry.actorId.toLowerCase();
      return name.includes(q) || username.includes(q) || id.includes(q);
    });
  }, [rawEntries, profiles, actorSearch]);

  return {
    categoryFilter,
    setCategoryFilter,
    actorIdFilter,
    setActorIdFilter,
    actorSearch,
    setActorSearch,
    entries,
    rawEntries,
    profiles,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    loadMore: query.fetchNextPage,
    refetch: query.refetch,
    isForbidden: isAuditForbidden(query.error),
    error: query.error,
    errorMessage: query.error ? auditErrorMessage(query.error) : null,
  };
}
