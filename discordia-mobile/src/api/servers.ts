import { apiFetch } from './client'
import type {
  Server,
  Channel,
  ServerBackendResponse,
  ChannelBackendResponse,
  ServerMember,
  ServerMemberPage,
  ServerMemberBackendResponse,
  ServerMemberPageBackendResponse,
} from '../types'

export interface CreateServerRequest {
  name: string
  icon?: any
}

export interface CreateChannelRequest {
  name: string
  type: 'text' | 'voice'
  categoryId?: string
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
  }
}

/**
 * Consulta una página de miembros de un servidor, con los roles de cada uno.
 * El backend pagina de a 50 por defecto.
 */
export async function getServerMembers(serverId: string, offset = 0): Promise<ServerMemberPage> {
  const raw = await apiFetch<ServerMemberPageBackendResponse>(
    `/api/v1/servers/${serverId}/members?offset=${offset}`,
  )
  return {
    items: (raw.items || []).map(mapServerMemberFromBackend),
    total: raw.total,
    limit: raw.limit,
    offset: raw.offset,
  }
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
  }
}

/**
 * Adaptador: Convierte un servidor del backend (snake_case) al modelo de dominio (camelCase).
 */
export function mapServerFromBackend(raw: ServerBackendResponse): Server {
  const channels = (raw.channels || []).map(mapChannelFromBackend)
  return {
    id: raw.id,
    name: raw.name,
    ownerId: raw.owner_id,
    iconUrl: raw.icon_url || null,
    icon: raw.icon_url || null,
    color: '#7c5cfc',
    description: raw.description || undefined,
    memberCount: 1,
    boostLevel: 0,
    boostCount: 0,
    channels,
    categories: [
      {
        id: 'default',
        name: 'GENERAL',
        channels,
      },
    ],
    roles: [],
    members: [raw.owner_id],
    createdAt: raw.created_at,
  }
}

/**
 * Consulta la lista de servidores a los que pertenece el usuario autenticado.
 */
export async function getServers(): Promise<Server[]> {
  const rawList = await apiFetch<ServerBackendResponse[]>('/api/v1/servers')
  return (rawList || []).map(mapServerFromBackend)
}

/**
 * Crea un nuevo servidor en Server-Roles-Core-Service vía multipart/form-data.
 */
export async function createServer(payload: CreateServerRequest): Promise<Server> {
  const formData = new FormData()
  formData.append('name', payload.name.trim())
  if (payload.icon) {
    formData.append('icon', payload.icon)
  }

  const raw = await apiFetch<ServerBackendResponse>('/api/v1/servers', {
    method: 'POST',
    body: formData,
  })
  return mapServerFromBackend(raw)
}

/**
 * Crea un nuevo canal (texto o voz) dentro de un servidor específico.
 */
export async function createChannel(
  serverId: string,
  payload: CreateChannelRequest,
): Promise<Channel> {
  const raw = await apiFetch<ChannelBackendResponse>(`/api/v1/servers/${serverId}/channels`, {
    method: 'POST',
    body: {
      name: payload.name.trim(),
      type: payload.type,
      category_id: payload.categoryId || null,
    },
  })
  return mapChannelFromBackend(raw)
}

export interface UpdateChannelRequest {
  name?: string
  topic?: string
}

/**
 * Actualiza el nombre o tema de un canal de un servidor.
 */
export async function updateChannel(
  serverId: string,
  channelId: string,
  payload: UpdateChannelRequest,
): Promise<Channel> {
  const body: Record<string, any> = {}
  if (payload.name !== undefined) {
    body.name = payload.name.trim()
  }
  if (payload.topic !== undefined) {
    body.topic = payload.topic.trim()
  }

  const raw = await apiFetch<ChannelBackendResponse>(
    `/api/v1/servers/${serverId}/channels/${channelId}`,
    {
      method: 'PATCH',
      body,
    },
  )
  return mapChannelFromBackend(raw)
}

/**
 * Elimina un canal de un servidor.
 */
export async function deleteChannel(serverId: string, channelId: string): Promise<void> {
  await apiFetch(`/api/v1/servers/${serverId}/channels/${channelId}`, {
    method: 'DELETE',
  })
}
