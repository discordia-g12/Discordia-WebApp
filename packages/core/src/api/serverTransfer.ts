import { api } from './client';
import { errorMessageFor } from './errors';
import type { ServerOwnershipTransfer, ServerOwnershipTransferBackendResponse } from '../types';

export function mapServerOwnershipTransferFromBackend(raw: ServerOwnershipTransferBackendResponse): ServerOwnershipTransfer {
  return {
    id: raw.id,
    serverId: raw.server_id,
    senderId: raw.sender_id,
    targetUserId: raw.target_user_id,
    status: raw.status,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at ?? null,
  };
}

export async function initiateServerTransfer(serverId: string, targetUserId: string): Promise<ServerOwnershipTransfer> {
  const raw = await api.post<ServerOwnershipTransferBackendResponse>(`/api/v1/servers/${serverId}/transfers`, {
    target_user_id: targetUserId,
  });
  return mapServerOwnershipTransferFromBackend(raw);
}

export async function getPendingServerTransfer(serverId: string): Promise<ServerOwnershipTransfer | null> {
  const raw = await api.get<ServerOwnershipTransferBackendResponse | null>(`/api/v1/servers/${serverId}/transfers/pending`);
  if (!raw) return null;
  return mapServerOwnershipTransferFromBackend(raw);
}

export async function acceptServerTransfer(serverId: string, transferId?: string): Promise<ServerOwnershipTransfer> {
  const path = transferId
    ? `/api/v1/servers/${serverId}/transfers/${transferId}/accept`
    : `/api/v1/servers/${serverId}/transfers/accept`;
  const raw = await api.post<ServerOwnershipTransferBackendResponse>(path);
  return mapServerOwnershipTransferFromBackend(raw);
}

export async function rejectServerTransfer(serverId: string, transferId?: string): Promise<ServerOwnershipTransfer> {
  const path = transferId
    ? `/api/v1/servers/${serverId}/transfers/${transferId}/reject`
    : `/api/v1/servers/${serverId}/transfers/reject`;
  const raw = await api.post<ServerOwnershipTransferBackendResponse>(path);
  return mapServerOwnershipTransferFromBackend(raw);
}

export async function cancelServerTransfer(serverId: string, transferId: string): Promise<ServerOwnershipTransfer> {
  const raw = await api.post<ServerOwnershipTransferBackendResponse>(`/api/v1/servers/${serverId}/transfers/${transferId}/cancel`);
  return mapServerOwnershipTransferFromBackend(raw);
}

export function transferErrorMessage(err: unknown): string {
  return errorMessageFor(
    err,
    {
      400: 'No se puede transferir la propiedad al usuario seleccionado.',
      403: 'Solo la dueña o el dueño del servidor puede realizar esta acción.',
      404: 'Servidor o solicitud de transferencia no encontrada.',
    },
    'No se pudo completar la transferencia de propiedad.'
  );
}

