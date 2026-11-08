/**
 * Tipos de las secciones del backoffice que todavía no tienen endpoint. Son el contrato esperado: al
 * implementarlos, los hooks de React Query de @discordia/core devuelven esto (como PlatformAccount para usuarios).
 */

export type AccountState = 'active' | 'suspended';

/** Ver listado de servidores: nombre, cantidad de miembros y fecha de creación; búsqueda por nombre. */
export interface PlatformServerRow {
  id: string;
  name: string;
  members: number;
  state: AccountState;
  createdAt: string;
}

export const ACCOUNT_STATE_LABEL: Record<AccountState, string> = {
  active: 'activo',
  suspended: 'suspendido',
};

/** "2026-10-20T..." → "20/10/2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}
