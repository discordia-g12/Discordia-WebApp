/**
 * Filas de los listados del backoffice, con los datos que piden los criterios de aceptación. Son el contrato
 * esperado de los endpoints de staff: al implementarlos (etapa 1), los hooks de React Query devuelven esto.
 */

export type AccountState = 'active' | 'suspended';

export type AccountStateFilter = 'all' | AccountState;

/** Ver listado de usuarios con filtros: búsqueda por email o nombre, filtro por estado. */
export interface PlatformUserRow {
  id: string;
  displayName: string;
  username: string;
  email: string;
  state: AccountState;
  /** Fecha de registro (ISO). */
  createdAt: string;
}

/** Ver listado de servidores: nombre, cantidad de miembros y fecha de creación; búsqueda por nombre. */
export interface PlatformServerRow {
  id: string;
  name: string;
  members: number;
  state: AccountState;
  createdAt: string;
}

export const ACCOUNT_STATE_OPTIONS: { value: AccountStateFilter; label: string }[] = [
  { value: 'all', label: 'todos' },
  { value: 'active', label: 'activos' },
  { value: 'suspended', label: 'suspendidos' },
];

export const ACCOUNT_STATE_LABEL: Record<AccountState, string> = {
  active: 'activo',
  suspended: 'suspendido',
};

/** "2026-10-20T..." → "20/10/2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}
