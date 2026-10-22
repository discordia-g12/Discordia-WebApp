import { ApiError, type ApiMock, type UserProfile } from '@discordia/core';
import { isMockNeedsProfile, setMockProfileCompleted } from '../auth/mock';
import { USERS, CURRENT_USER_ID } from '../data/mock';

/**
 * Respuestas de la API en modo mock (solo desarrollo, VITE_USE_MOCK=true). Se registran en core con
 * setApiMock desde auth/session.ts, con import() dinámico: no llegan al build de producción.
 */
export const apiMock: ApiMock = {
  async getMyProfile() {
    if (isMockNeedsProfile()) {
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
    setMockProfileCompleted();
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
