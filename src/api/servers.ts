import { api } from './client';
import {
  Server,
  Channel,
  ServerBackendResponse,
  ChannelBackendResponse,
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
    category_id: (payload.parentId && payload.parentId.startsWith("cat-")) ? undefined : payload.parentId,
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
}

/**
 * Edita un canal de un servidor.
 */
export async function editChannel(serverId: string, channelId: string, payload: EditChannelRequest): Promise<Channel> {
  const rawChannel = await api.patch<ChannelBackendResponse>(`/api/v1/servers/${serverId}/channels/${channelId}`, payload);
  return mapChannelFromBackend(rawChannel);
}

export async function createInvite(serverId: string, payload: { maxUses: number, expiresInSeconds: number }): Promise<{ code: string }> {
  return await api.post(`/api/v1/servers/${serverId}/invites`, payload);
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
