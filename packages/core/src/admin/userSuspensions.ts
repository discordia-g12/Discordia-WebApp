import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { ApiError, NetworkError, PROBLEM_TYPES, TimeoutError } from '../api/errors';
import { isForbidden, isUnauthorized } from './platformStatus';

/**
 * Suspender y reactivar cuentas a nivel plataforma (backoffice, solo staff). Los endpoints son de Auth-User
 * (/api/v1/admin/users): bloquean la cuenta en Auth0, la agregan a la lista de suspendidos del Gateway y
 * publican user.suspended, con el que Chat y Voz cierran sus conexiones (ADR-002 de Auth-User). Kong exige el
 * rol staff y Auth-User lo vuelve a chequear: el front solo muestra lo que responden.
 */

/** Una cuenta como la ve el backoffice. */
export interface PlatformAccount {
  userId: string;
  username: string | null;
  displayName: string | null;
  email: string;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedBy: string | null;
  suspensionReason: string | null;
  createdAt: string;
}

interface PlatformAccountResponse {
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  email: string;
  is_suspended: boolean;
  suspended_at?: string | null;
  suspended_by?: string | null;
  suspension_reason?: string | null;
  created_at: string;
}

export function toPlatformAccount(raw: PlatformAccountResponse): PlatformAccount {
  return {
    userId: raw.user_id,
    username: raw.username ?? null,
    displayName: raw.display_name ?? null,
    email: raw.email,
    isSuspended: raw.is_suspended === true,
    suspendedAt: raw.suspended_at ?? null,
    suspendedBy: raw.suspended_by ?? null,
    suspensionReason: raw.suspension_reason ?? null,
    createdAt: raw.created_at,
  };
}

/** Cómo mostrar la cuenta: nombre y @usuario, o el email si todavía no creó el perfil. */
export function platformAccountLabel(account: Pick<PlatformAccount, 'displayName' | 'username' | 'email'>): string {
  if (account.username) return account.displayName ? `${account.displayName} (@${account.username})` : `@${account.username}`;
  return account.email;
}

export interface SuspendAccountInput {
  /** Email, "@usuario" o id. */
  user: string;
  /** Motivo: queda en la cuenta y en el evento user.suspended (auditoría). */
  reason: string;
}

export const suspendedAccountsQueryKey = ['admin', 'suspendedAccounts'] as const;

export async function listSuspendedAccounts(): Promise<PlatformAccount[]> {
  const raw = await api.get<PlatformAccountResponse[]>('/api/v1/admin/users/suspended');
  return raw.map(toPlatformAccount);
}

export async function suspendAccount(input: SuspendAccountInput): Promise<PlatformAccount> {
  const raw = await api.post<PlatformAccountResponse>('/api/v1/admin/users/suspensions', {
    user: input.user.trim(),
    reason: input.reason.trim(),
  });
  return toPlatformAccount(raw);
}

export async function reactivateAccount(userId: string): Promise<PlatformAccount> {
  const raw = await api.delete<PlatformAccountResponse>(`/api/v1/admin/users/${encodeURIComponent(userId)}/suspension`);
  return toPlatformAccount(raw);
}

const noAuthRetry = (failureCount: number, error: unknown) =>
  !isUnauthorized(error) && !isForbidden(error) && failureCount < 2;

/** Cuentas suspendidas, la más reciente primero (para reactivarlas). */
export function useSuspendedAccounts({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: suspendedAccountsQueryKey,
    queryFn: listSuspendedAccounts,
    enabled,
    retry: noAuthRetry,
  });
}

/** Suspender una cuenta. Al terminar se vuelve a pedir el listado de suspendidas. */
export function useSuspendAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: suspendAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suspendedAccountsQueryKey }),
  });
}

/** Reactivar una cuenta suspendida. */
export function useReactivateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reactivateAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suspendedAccountsQueryKey }),
  });
}

export type SuspensionAction = 'suspend' | 'reactivate' | 'list';

/** Mensaje para el staff cuando falla suspender, reactivar o listar. Siempre dice qué hacer. */
export function suspensionErrorMessage(error: unknown, action: SuspensionAction): string {
  if (error instanceof NetworkError || error instanceof TimeoutError) {
    return 'No pudimos conectar con el servidor. Revisá tu conexión y probá de nuevo.';
  }
  if (isUnauthorized(error)) return 'Tu sesión venció, volvé a iniciar sesión.';
  if (error instanceof ApiError && error.type === PROBLEM_TYPES.ACCOUNT_SUSPENDED) {
    return 'Tu propia cuenta está suspendida.';
  }
  if (isForbidden(error)) return 'Tu cuenta no tiene permisos de staff: el servidor rechazó el pedido.';
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return 'No podés suspender tu propia cuenta.';
      case 404:
        return action === 'suspend'
          ? 'No hay ninguna cuenta con ese email, @usuario o id.'
          : 'Esa cuenta ya no existe.';
      case 409:
        return action === 'suspend' ? 'Esa cuenta ya está suspendida.' : 'Esa cuenta ya no estaba suspendida.';
      case 422:
        return 'Completá el usuario y el motivo.';
      case 503:
        return 'No se pudo aplicar ahora: Auth0 o la lista de suspendidos no respondieron. No quedó nada a medias, probá de nuevo.';
    }
  }
  if (action === 'list') return 'No pudimos traer las cuentas suspendidas.';
  return action === 'suspend' ? 'No se pudo suspender la cuenta.' : 'No se pudo reactivar la cuenta.';
}
