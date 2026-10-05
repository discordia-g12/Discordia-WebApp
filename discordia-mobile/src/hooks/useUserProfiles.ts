import { useEffect, useRef, useState } from 'react'
import { api } from '@shared/api/client'

export interface PublicProfile {
  id: string
  name: string
  avatar: string | null
}

interface BulkUserResponse {
  id?: string
  user_id?: string
  username: string
  display_name?: string | null
  avatar_url?: string | null
}

/**
 * Perfiles públicos (nombre, avatar) de usuarios que la app todavía no conoce, vía
 * POST /api/v1/users/bulk. Cada ID se pide una sola vez; si falla, se reintenta en el próximo cambio.
 *
 * Llama directo al endpoint en vez de usar getUsersBulk de la API compartida porque esa función usa
 * import.meta.env (Vite), que Metro no soporta.
 */
export function useUserProfiles(userIds: string[]): Record<string, PublicProfile> {
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({})
  const requestedRef = useRef(new Set<string>())
  const idsKey = Array.from(new Set(userIds)).sort().join(',')

  useEffect(() => {
    const missing = idsKey ? idsKey.split(',').filter(id => !requestedRef.current.has(id)) : []
    if (missing.length === 0) return
    missing.forEach(id => requestedRef.current.add(id))

    api
      .post<BulkUserResponse[]>('/api/v1/users/bulk', { user_ids: missing })
      .then(users => {
        setProfiles(prev => {
          const next = { ...prev }
          for (const u of users) {
            const id = u.user_id || u.id
            if (!id) continue
            next[id] = { id, name: u.display_name || u.username, avatar: u.avatar_url ?? null }
          }
          return next
        })
      })
      .catch(err => {
        console.error('[Users] Error al traer perfiles:', err)
        missing.forEach(id => requestedRef.current.delete(id))
      })
  }, [idsKey])

  return profiles
}
