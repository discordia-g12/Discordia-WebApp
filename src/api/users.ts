import { api } from './client';
import { ApiError } from './errors';
import { User } from '../types';

export interface UserProfile extends User {
  user_id?: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface CreateProfileRequest {
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export interface UpdateProfileRequest {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  custom_status?: string;
}

/**
 * Consulta el perfil del usuario autenticado en Auth-User-Service.
 * Si el usuario nunca inicializó su perfil en Discordia, devuelve 404.
 */
export async function getMyProfile(): Promise<UserProfile> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    const { isMockNeedsProfile } = await import('../auth/mock');
    if (isMockNeedsProfile()) {
      throw new ApiError({ status: 404, detail: 'Mock profile not found' });
    }
    const { USERS, CURRENT_USER_ID } = await import('../data/mock');
    const user = USERS[CURRENT_USER_ID];
    return {
      ...user,
      display_name: user.displayName,
      avatar_url: user.avatar,
    };
  }

  const res = await api.get<any>('/api/v1/users/me');
  return {
    ...res,
    id: res.user_id || res.id,
    displayName: res.display_name || res.username,
    display_name: res.display_name || res.username,
    avatar: res.avatar_url || res.avatar,
    status: (res.activity_status === 'offline' ? 'offline' : (res.activity_status || 'online')) as any,
  };
}

/**
 * Registra de forma idempotente el perfil de usuario en Auth-User-Service.
 * Llama directamente a POST /api/v1/users/me sanitizando el nombre de usuario.
 */
export async function upsertMyProfile(payload: CreateProfileRequest): Promise<UserProfile> {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    const { setMockProfileCompleted } = await import('../auth/mock');
    setMockProfileCompleted();
    const { USERS, CURRENT_USER_ID } = await import('../data/mock');
    const existing = USERS[CURRENT_USER_ID];
    return {
      ...existing,
      username: payload.username,
      displayName: payload.display_name || payload.username,
      display_name: payload.display_name || payload.username,
      bio: payload.bio || existing.bio,
    };
  }

  // Sanitizar username según requisitos de backend (^[a-zA-Z0-9_.-]{3,32}$)
  const rawClean = (payload.username || '')
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .slice(0, 32);
  const cleanUsername = rawClean.length < 3 ? rawClean.padEnd(3, '0') : rawClean;

  const cleanDisplayName = (payload.display_name || '').trim().slice(0, 64);

  const requestBody = {
    username: cleanUsername,
    display_name: cleanDisplayName || undefined,
    bio: payload.bio || undefined,
    avatar_url: payload.avatar_url || undefined,
  };

  try {
    const res = await api.post<any>('/api/v1/users/me', requestBody);
    return {
      ...res,
      id: res.user_id || res.id,
      displayName: res.display_name || res.username,
      display_name: res.display_name || res.username,
      avatar: res.avatar_url || payload.avatar_url,
      status: 'online',
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      // Si el perfil ya existía previamente en la base de datos, recuperarlo
      const detailMsg = String(err.detail || '').toLowerCase();
      if (detailMsg.includes('already has a registered profile') || detailMsg.includes('already registered')) {
        return await getMyProfile();
      }
    }
    throw err;
  }
}

/**
 * Actualiza atributos modificables del perfil de usuario.
 */
export async function updateMyProfile(payload: UpdateProfileRequest): Promise<UserProfile> {
  return await api.patch<UserProfile>('/api/v1/users/me/profile', payload);
}


/** Máximo de IDs que acepta POST /api/v1/users/bulk por pedido. */
const BULK_LIMIT = 100;

/**
 * Obtiene los perfiles de multiples usuarios dado sus IDs (en lotes de BULK_LIMIT).
 * Los usuarios sin perfil inicializado no vienen en la respuesta.
 */
export async function getUsersBulk(userIds: string[]): Promise<UserProfile[]> {
  if (!userIds.length) return [];
  
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
    const { USERS } = await import('../data/mock');
    return userIds.map(id => {
      const u = USERS[id];
      if (!u) return null;
      return {
        ...u,
        display_name: u.displayName,
        avatar_url: u.avatar
      };
    }).filter(Boolean) as UserProfile[];
  }

  const uniqueIds = Array.from(new Set(userIds));
  const batches: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += BULK_LIMIT) {
    batches.push(uniqueIds.slice(i, i + BULK_LIMIT));
  }
  const responses = await Promise.all(
    batches.map((batch) => api.post<any[]>('/api/v1/users/bulk', { user_ids: batch }))
  );

  return responses.flat().map((u: any) => ({
    ...u,
    id: u.user_id || u.id,
    displayName: u.display_name || u.username,
    display_name: u.display_name || u.username,
    avatar: u.avatar_url || u.avatar,
    status: (u.activity_status === 'offline' ? 'offline' : (u.activity_status || 'online')) as any,
  }));
}
