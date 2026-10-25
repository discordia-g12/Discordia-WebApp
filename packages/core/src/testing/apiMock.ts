import { ApiError } from '../api/errors';
import type { ApiMock } from '../api/mock';
import type { UserProfile } from '../api/users';
import { USERS, CURRENT_USER_ID } from './data';

export interface ApiMockOptions {
  /** true si el usuario simulado todavía no creó su perfil (getMyProfile responde 404). */
  needsProfile?: () => boolean;
  /** Se llama al crear el perfil simulado. */
  onProfileCompleted?: () => void;
}

/**
 * Respuestas de la API para desarrollar sin backend, con los datos de testing/data.ts. Cada app las
 * registra con setApiMock solo en modo desarrollo (la web con VITE_USE_MOCK).
 */
export function createApiMock({ needsProfile = () => false, onProfileCompleted }: ApiMockOptions = {}): ApiMock {
  return {
    async getMyProfile() {
      if (needsProfile()) {
        throw new ApiError({ status: 404, detail: 'Mock profile not found' });
      }
      const user = USERS[CURRENT_USER_ID];
      return {
        ...user,
        display_name: user.displayName,
        avatar_url: user.avatar,
      };
    },

    async upsertMyProfile(payload) {
      onProfileCompleted?.();
      const existing = USERS[CURRENT_USER_ID];
      return {
        ...existing,
        username: payload.username,
        displayName: payload.display_name || payload.username,
        display_name: payload.display_name || payload.username,
        bio: payload.bio || existing.bio,
      };
    },

    async getUsersBulk(userIds) {
      return userIds.map(id => {
        const u = USERS[id];
        if (!u) return null;
        return {
          ...u,
          display_name: u.displayName,
          avatar_url: u.avatar
        };
      }).filter(Boolean) as UserProfile[];
    },

    async requestPasswordReset() {},
  };
}
