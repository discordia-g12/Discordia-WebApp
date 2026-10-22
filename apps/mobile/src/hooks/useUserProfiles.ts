import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@discordia/core'
import { useData } from '../providers/AppProviders'

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

// Máximo de IDs que acepta POST /api/v1/users/bulk por pedido
const BULK_LIMIT = 100

/**
 * Perfiles públicos (nombre, avatar) de usuarios que la app todavía no conoce, vía
 * POST /api/v1/users/bulk (en lotes de BULK_LIMIT). Cada ID se pide una sola vez; si falla,
 * se reintenta en el próximo cambio.
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

    for (let i = 0; i < missing.length; i += BULK_LIMIT) {
      const batch = missing.slice(i, i + BULK_LIMIT)
      api
        .post<BulkUserResponse[]>('/api/v1/users/bulk', { user_ids: batch })
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
          batch.forEach(id => requestedRef.current.delete(id))
        })
    }
  }, [idsKey])

  return profiles
}

export interface UserDisplay {
  name: string
  color: string
}

// Color estable para el avatar de usuarios que la app no tiene cargados
const AVATAR_COLORS = ['#7c5cfc', '#3db57a', '#f5a623', '#5865f2', '#ed4245', '#ff73fa']
function colorFor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/**
 * Nombre y color para mostrar a cualquier usuario: primero los que la app ya tiene cargados
 * (incluido el propio, que se mantiene al día al editar el perfil); el resto se pide al backend.
 */
export function useUserDisplay(userIds: string[]): (userId: string) => UserDisplay {
  const { users } = useData()
  const profiles = useUserProfiles(userIds.filter(id => !users[id]))

  return useCallback(
    (userId: string) => ({
      name: users[userId]?.name ?? profiles[userId]?.name ?? 'Usuario',
      color: users[userId]?.color ?? colorFor(userId),
    }),
    [users, profiles],
  )
}
