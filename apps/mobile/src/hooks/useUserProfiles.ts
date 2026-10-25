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
  avatar: string | null
}

/**
 * Nombre y avatar para mostrar a cualquier usuario: primero los que la app ya tiene cargados
 * (incluido el propio, que se mantiene al día al editar el perfil); el resto se pide al backend.
 */
export function useUserDisplay(userIds: string[]): (userId: string) => UserDisplay {
  const { users } = useData()
  const profiles = useUserProfiles(userIds.filter(id => !users[id]))

  return useCallback(
    (userId: string) => ({
      name: users[userId]?.displayName ?? profiles[userId]?.name ?? 'Usuario',
      avatar: users[userId]?.avatar ?? profiles[userId]?.avatar ?? null,
    }),
    [users, profiles],
  )
}
