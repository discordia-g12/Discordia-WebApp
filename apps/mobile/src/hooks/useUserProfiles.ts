import { useCallback, useMemo } from 'react'
import { useUserProfiles as useCoreUserProfiles } from '@discordia/core'
import { useData } from '../providers/AppProviders'

export interface PublicProfile {
  id: string
  name: string
  avatar: string | null
}

/**
 * Perfiles públicos (nombre, avatar) de usuarios que la app todavía no conoce. Los trae el hook de
 * @discordia/core (POST /api/v1/users/bulk, el mismo que la web); acá solo se pasan al modelo de la UI.
 */
export function useUserProfiles(userIds: string[]): Record<string, PublicProfile> {
  const users = useCoreUserProfiles(userIds)

  return useMemo(() => {
    const profiles: Record<string, PublicProfile> = {}
    for (const u of Object.values(users)) {
      profiles[u.id] = { id: u.id, name: u.displayName || u.username, avatar: u.avatar ?? null }
    }
    return profiles
  }, [users])
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
