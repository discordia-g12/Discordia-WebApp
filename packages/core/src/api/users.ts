import { api } from './client';
import { ApiError } from './errors';
import { getApiMock } from './mock';
import { appendFile, UPLOAD_TIMEOUT_MS, type UploadableFile } from './images';
import { PublicProfile, PublicProfileBackendResponse, Status, User } from '../types';

/** Perfil de Auth-User-Service: el modelo de dominio más los campos crudos del backend (snake_case). */
export interface UserProfile extends User {
  user_id?: string;
  email?: string;
  display_name?: string;
  avatar_url?: string | null;
  activity_status?: string;
  custom_status?: string;
  created_at?: string;
}

/** Respuesta cruda de Auth-User-Service (snake_case). */
interface UserBackendResponse {
  id?: string;
  user_id?: string;
  username: string;
  email?: string;
  display_name?: string;
  avatar_url?: string | null;
  avatar?: string;
  bio?: string;
  activity_status?: string;
  custom_status?: string;
  created_at?: string;
  /** Suspendida por la plataforma: Auth-User solo manda el nombre (perfil no disponible). */
  is_suspended?: boolean;
}

function toUserProfile(res: UserBackendResponse): UserProfile {
  return {
    ...res,
    isSuspended: res.is_suspended === true,
    id: res.user_id || res.id || '',
    displayName: res.display_name || res.username,
    display_name: res.display_name || res.username,
    avatar: res.avatar_url || res.avatar,
    // activity_status de Auth no se actualiza: la presencia sale de Chat-Engine (getPresence / getMyStatus)
    status: 'offline' as Status,
  };
}

export function mapPublicProfileFromBackend(raw: PublicProfileBackendResponse): PublicProfile {
  return {
    id: raw.user_id,
    username: raw.username,
    displayName: raw.display_name || raw.username,
    avatarUrl: raw.avatar_url,
    bio: raw.bio,
    customStatus: raw.custom_status,
    createdAt: raw.created_at,
    relationship: raw.relationship,
    ...(raw.friend_request_id ? { friendRequestId: raw.friend_request_id } : {}),
  };
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
  const mock = getApiMock();
  if (mock) return mock.getMyProfile();

  return toUserProfile(await api.get<UserBackendResponse>('/api/v1/users/me'));
}

/**
 * Registra de forma idempotente el perfil de usuario en Auth-User-Service.
 * Llama directamente a POST /api/v1/users/me sanitizando el nombre de usuario.
 */
export async function upsertMyProfile(payload: CreateProfileRequest): Promise<UserProfile> {
  const mock = getApiMock();
  if (mock) return mock.upsertMyProfile(payload);

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
    const res = await api.post<UserBackendResponse>('/api/v1/users/me', requestBody);
    return {
      ...res,
      id: res.user_id || res.id || '',
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
 * El avatar nuevo se sube con uploadMyAvatar, no como `avatar_url` acá.
 */
export async function updateMyProfile(payload: UpdateProfileRequest): Promise<UserProfile> {
  return await api.patch<UserProfile>('/api/v1/users/me/profile', payload);
}

/**
 * Sube un avatar nuevo (PATCH /profile/avatar, multipart con el campo "file"). El backend lo valida, lo
 * recorta a 256×256, lo guarda en S3 y devuelve el perfil con la URL nueva; la anterior deja de existir,
 * así que hay que usar la que vuelve acá.
 *
 * `file`: un File o Blob, o en React Native el { uri, name, type } (ver UploadableFile).
 */
export async function uploadMyAvatar(file: UploadableFile, filename = 'avatar'): Promise<UserProfile> {
  const form = new FormData();
  appendFile(form, 'file', file, filename);
  return toUserProfile(
    await api.patch<UserBackendResponse>('/api/v1/users/me/profile/avatar', form, { timeoutMs: UPLOAD_TIMEOUT_MS })
  );
}


/** Máximo de IDs que acepta POST /api/v1/users/bulk por pedido. */
const BULK_LIMIT = 100;

/**
 * Obtiene los perfiles de multiples usuarios dado sus IDs (en lotes de BULK_LIMIT).
 * Los usuarios sin perfil inicializado no vienen en la respuesta.
 */
export async function getUsersBulk(userIds: string[]): Promise<UserProfile[]> {
  if (!userIds.length) return [];

  const mock = getApiMock();
  if (mock) return mock.getUsersBulk(userIds);

  const uniqueIds = Array.from(new Set(userIds));
  const batches: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += BULK_LIMIT) {
    batches.push(uniqueIds.slice(i, i + BULK_LIMIT));
  }
  const responses = await Promise.all(
    batches.map((batch) => api.post<UserBackendResponse[]>('/api/v1/users/bulk', { user_ids: batch }))
  );

  return responses.flat().map(toUserProfile);
}

/**
 * Perfil público de un usuario. Si está suspendido o no existe responde 404: la interfaz muestra "perfil
 * no disponible" (ver isProfileUnavailable).
 */
export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  const mock = getApiMock();
  if (mock?.getPublicProfile) return mock.getPublicProfile(userId);

  return mapPublicProfileFromBackend(
    await api.get<PublicProfileBackendResponse>(`/api/v1/users/${encodeURIComponent(userId)}/profile`)
  );
}

/** true si el error de getPublicProfile significa "perfil no disponible" (suspendido o inexistente). */
export function isProfileUnavailable(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}
