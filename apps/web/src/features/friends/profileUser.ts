import type { PresenceMap, PublicProfile } from '@discordia/core';
import type { User } from '../../types';

/** Un perfil público como User, para los componentes que muestran usuarios. La presencia sale del inbox. */
export function profileToUser(profile: PublicProfile, presence?: PresenceMap): User {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    avatar: profile.avatarUrl ?? undefined,
    bio: profile.bio ?? undefined,
    customStatus: profile.customStatus ?? undefined,
    createdAt: profile.createdAt,
    status: presence?.[profile.id] ?? 'offline',
  };
}
