import { useEffect, useRef, useState } from 'react';
import { getUsersBulk } from '@discordia/core';
import type { User } from '../../types';

/**
 * Perfiles públicos de los usuarios indicados, vía POST /api/v1/users/bulk.
 * Cada ID se pide una sola vez (aunque el backend no devuelva perfil para él, así no se
 * repite el pedido en cada render); si el pedido falla, se reintenta en el próximo cambio.
 */
export function useUserProfiles(userIds: string[]): Record<string, User> {
  const [profiles, setProfiles] = useState<Record<string, User>>({});
  const requestedRef = useRef(new Set<string>());
  const idsKey = Array.from(new Set(userIds.filter(Boolean))).sort().join(',');

  useEffect(() => {
    const missing = idsKey ? idsKey.split(',').filter((id) => !requestedRef.current.has(id)) : [];
    if (missing.length === 0) return;
    missing.forEach((id) => requestedRef.current.add(id));

    getUsersBulk(missing)
      .then((users) => {
        setProfiles((prev) => {
          const next = { ...prev };
          users.forEach((u) => {
            next[u.id] = u;
          });
          return next;
        });
      })
      .catch((err) => {
        console.error('[Users] Error al traer perfiles:', err);
        missing.forEach((id) => requestedRef.current.delete(id));
      });
  }, [idsKey]);

  return profiles;
}
