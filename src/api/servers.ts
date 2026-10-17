import { api } from './client';
import {
  LOCAL_CATEGORY_PREFIX,
  toBackendCategoryId,
  toCategoryOrder,
  toChannelOrder,
} from './channelLayout';

export { isLocalCategoryId } from './channelLayout';
import {
  Server,
  Category,
  Channel,
  ServerBackendResponse,
  ChannelBackendResponse,
  CategoryBackendResponse,
  ServerMember,
  ServerMemberPage,
  ServerMemberBackendResponse,
  ServerMemberPageBackendResponse,
} from '../types';

export interface CreateServerRequest {
  name: string;
  icon?: File;
}

export interface CreateChannelRequest {
  name: string;
  type: 'text' | 'voice' | 'announcement';
  topic?: string;
  parentId?: string;
}

export interface GetServerMembersOptions {
  limit?: number;
  offset?: number;
}

/**
 * Adaptador: Convierte un miembro del backend (snake_case) al modelo de dominio (camelCase).
 */
export function mapServerMemberFromBackend(raw: ServerMemberBackendResponse): ServerMember {
  return {
    id: raw.id,
    userId: raw.user_id,
    nickname: raw.nickname,
    roleIds: raw.role_ids,
  };
}

/**
 * Consulta una página de miembros de un servidor, con los roles de cada uno.
 * El backend pagina de a 50 por defecto.
 */
export async function getServerMembers(
  serverId: string,
  options: GetServerMembersOptions = {}
): Promise<ServerMemberPage> {
  const raw = await api.get<ServerMemberPageBackendResponse>(`/api/v1/servers/${serverId}/members`, {
    query: { limit: options.limit, offset: options.offset },
  });
  return {
    items: (raw.items || []).map(mapServerMemberFromBackend),
    total: raw.total,
    limit: raw.limit,
    offset: raw.offset,
  };
}

/**
 * Adaptador: Convierte un canal del backend (snake_case) al modelo de dominio (camelCase).
 */
export function mapChannelFromBackend(raw: ChannelBackendResponse): Channel {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    serverId: raw.server_id,
    categoryId: raw.category_id || undefined,
    position: raw.position,
    topic: raw.topic || undefined,
  };
}

/**
 * Adaptador: Convierte un servidor del backend (snake_case) al modelo de dominio (camelCase).
 */
export function mapServerFromBackend(raw: ServerBackendResponse): Server {
  const channels = (raw.channels || []).map(mapChannelFromBackend);

  // Canales sin categoría (CA 3: se muestran fuera de cualquier agrupación, en una sección general)
  const uncategorizedChannels = channels.filter((ch) => !ch.categoryId);

  // Categorías persistidas en el backend
  const mappedCategories: Category[] = (raw.categories || []).map((cat) => ({
    id: cat.id,
    serverId: raw.id,
    name: cat.name,
    position: cat.position,
    channels: channels.filter((ch) => ch.categoryId === cat.id),
  }));

  const categories: Category[] = [];

  // Si hay canales sin categoría, o si no hay ninguna categoría creada aún, mostramos la sección general
  if (uncategorizedChannels.length > 0 || mappedCategories.length === 0) {
    categories.push({
      id: `${LOCAL_CATEGORY_PREFIX}${raw.id}-general`,
      serverId: raw.id,
      name: 'GENERAL',
      channels: uncategorizedChannels,
    });
  }

  categories.push(...mappedCategories);

  return {
    id: raw.id,
    name: raw.name,
    ownerId: raw.owner_id,
    iconUrl: raw.icon_url || undefined,
    icon: raw.icon_url || undefined,
    description: raw.description || undefined,
    channels,
    categories,
    roles: [],
    members: [],
    boostLevel: 0,
    boostCount: 0,
    createdAt: raw.created_at,
  };
}

/**
 * Consulta la lista de servidores a los que pertenece el usuario.
 */
export async function getServers(): Promise<Server[]> {
  const rawServers = await api.get<ServerBackendResponse[]>('/api/v1/servers');
  return (rawServers || []).map(mapServerFromBackend);
}

/**
 * Crea un nuevo servidor en Server-Roles-Core-Service.
 */
export async function createServer(payload: CreateServerRequest): Promise<Server> {
  const formData = new FormData();
  formData.append('name', payload.name);
  if (payload.icon) {
    formData.append('icon', payload.icon);
  }
  const rawServer = await api.post<ServerBackendResponse>('/api/v1/servers', formData);
  return mapServerFromBackend(rawServer);
}

/**
 * Crea un canal dentro de un servidor específico.
 */
export async function createChannel(
  serverId: string,
  payload: CreateChannelRequest
): Promise<Channel> {
  const backendPayload = {
    name: payload.name,
    type: payload.type,
    category_id: toBackendCategoryId(payload.parentId) ?? undefined,
  };
  const rawChannel = await api.post<ChannelBackendResponse>(`/api/v1/servers/${serverId}/channels`, backendPayload);
  return mapChannelFromBackend(rawChannel);
}

/**
 * Elimina un canal de un servidor.
 */
export async function deleteChannel(serverId: string, channelId: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}/channels/${channelId}`);
}


export interface EditChannelRequest {
  name?: string;
  topic?: string;
  categoryId?: string | null;
}

/**
 * Edita un canal de un servidor.
 */
export async function editChannel(serverId: string, channelId: string, payload: EditChannelRequest): Promise<Channel> {
  const backendPayload: Record<string, any> = {};
  if (payload.name !== undefined) backendPayload.name = payload.name;
  if (payload.topic !== undefined) backendPayload.topic = payload.topic;
  if (payload.categoryId !== undefined) backendPayload.category_id = toBackendCategoryId(payload.categoryId);

  const rawChannel = await api.patch<ChannelBackendResponse>(`/api/v1/servers/${serverId}/channels/${channelId}`, backendPayload);
  return mapChannelFromBackend(rawChannel);
}

export interface CreateCategoryRequest {
  name: string;
}

/**
 * Crea una nueva categoría dentro de un servidor específico.
 */
export async function createCategory(serverId: string, payload: CreateCategoryRequest): Promise<Category> {
  const rawCategory = await api.post<CategoryBackendResponse>(`/api/v1/servers/${serverId}/categories`, payload);
  return {
    id: rawCategory.id,
    serverId: rawCategory.server_id,
    name: rawCategory.name,
    position: rawCategory.position,
    channels: [],
  };
}

/**
 * Obtiene las categorías de un servidor.
 */
export async function getCategories(serverId: string): Promise<Category[]> {
  const rawCategories = await api.get<CategoryBackendResponse[]>(`/api/v1/servers/${serverId}/categories`);
  return (rawCategories || []).map((cat) => ({
    id: cat.id,
    serverId: cat.server_id,
    name: cat.name,
    position: cat.position,
    channels: [],
  }));
}

/**
 * Elimina una categoría de un servidor.
 */
export async function deleteCategory(serverId: string, categoryId: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}/categories/${categoryId}`);
}

export async function createInvite(serverId: string, payload: { maxUses?: number, expiresInSeconds?: number }): Promise<{ code: string }> {
  return await api.post(`/api/v1/servers/${serverId}/invites`, {
    max_uses: payload.maxUses || undefined,
    expires_in_seconds: payload.expiresInSeconds || undefined
  });
}

export async function joinServerViaInvite(code: string): Promise<{ server_id: string }> {
  return await api.post(`/api/v1/invites/${code}/join`);
}

export async function leaveServer(serverId: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}/leave`);
}

export async function deleteServer(serverId: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}`);
}


export async function getInvitePreview(code: string): Promise<any> {
  return await api.get(`/api/v1/invites/${code}`);
}

/**
 * Guarda el orden de todos los canales del servidor tal como se muestran en `categories`
 * (incluye la categoría de cada canal, así un arrastre también puede moverlo de categoría).
 */
export async function reorderChannels(serverId: string, categories: Category[]): Promise<void> {
  await api.put(`/api/v1/servers/${serverId}/channels/order`, { channels: toChannelOrder(categories) });
}

/** Guarda el orden de todas las categorías del servidor tal como se muestran en `categories`. */
export async function reorderCategories(serverId: string, categories: Category[]): Promise<void> {
  await api.put(`/api/v1/servers/${serverId}/categories/order`, { category_ids: toCategoryOrder(categories) });
}
