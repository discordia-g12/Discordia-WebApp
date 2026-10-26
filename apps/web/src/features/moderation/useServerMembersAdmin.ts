import { useEffect, useRef } from 'react';
import { useServerMembersAdmin as useCoreServerMembersAdmin } from '@discordia/core';

/**
 * Miembros del servidor para los ajustes: el estado y las reglas son de core (los mismos que mobile); acá
 * solo se suma la paginación del navegador: la página siguiente se pide cuando el centinela del final de
 * la lista entra en vista. Compartido por la vista del rediseño y la anterior (ServerMembersTab).
 */
export function useServerMembersAdmin(serverId: string) {
  const admin = useCoreServerMembersAdmin(serverId);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasNextPage, loadMore, members } = admin;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: listRef.current }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, loadMore, members.length]);

  return { ...admin, listRef, sentinelRef };
}

export type ServerMembersAdminState = ReturnType<typeof useServerMembersAdmin>;
