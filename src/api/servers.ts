import { api } from './client';
import { Server, Channel, ServerBackendResponse, ChannelBackendResponse } from '../types';

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
  };
}

/**
 * Adaptador: Convierte un servidor del backend (snake_case) al modelo de dominio (camelCase).
 */
export function mapServerFromBackend(raw: ServerBackendResponse): Server {
  const channels = (raw.channels || []).map(mapChannelFromBackend);
  return {
    id: raw.id,
    name: raw.name,
    ownerId: raw.owner_id,
    iconUrl: raw.icon_url || undefined,
    icon: raw.icon_url || undefined,
    description: raw.description || undefined,
    channels,
    categories: [
      {
        id: `cat-${raw.id}-general`,
        serverId: raw.id,
        name: 'GENERAL',
        channels,
      },
    ],
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
  let raw: ServerBackendResponse;
  if (payload.icon) {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('icon', payload.icon);
    raw = await api.post<ServerBackendResponse>('/api/v1/servers', formData);
  } else {
    raw = await api.post<ServerBackendResponse>('/api/v1/servers', { name: payload.name });
  }
  return mapServerFromBackend(raw);
}

/**
 * Crea un canal dentro de un servidor específico.
 */
export async function createChannel(
  serverId: string,
  payload: CreateChannelRequest
): Promise<Channel> {
  const raw = await api.post<ChannelBackendResponse>(`/api/v1/servers/${serverId}/channels`, payload);
  return mapChannelFromBackend(raw);
}

/**
 * Elimina un canal de un servidor.
 */
export async function deleteChannel(serverId: string, channelId: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}/channels/${channelId}`);
}

