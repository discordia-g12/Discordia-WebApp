import { api } from './client';
import { Server, Channel } from '../types';

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
 * Consulta la lista de servidores a los que pertenece el usuario.
 */
export async function getServers(): Promise<Server[]> {
  return await api.get<Server[]>('/api/v1/servers');
}

/**
 * Crea un nuevo servidor en Server-Roles-Core-Service.
 */
export async function createServer(payload: CreateServerRequest): Promise<Server> {
  if (payload.icon) {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('icon', payload.icon);
    return await api.post<Server>('/api/v1/servers', formData);
  }
  return await api.post<Server>('/api/v1/servers', { name: payload.name });
}

/**
 * Crea un canal dentro de un servidor específico.
 */
export async function createChannel(
  serverId: string,
  payload: CreateChannelRequest
): Promise<Channel> {
  return await api.post<Channel>(`/api/v1/servers/${serverId}/channels`, payload);
}

/**
 * Elimina un canal de un servidor.
 */
export async function deleteChannel(serverId: string, channelId: string): Promise<void> {
  await api.delete(`/api/v1/servers/${serverId}/channels/${channelId}`);
}

