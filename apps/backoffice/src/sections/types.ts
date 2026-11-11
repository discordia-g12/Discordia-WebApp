/**
 * Tipos de las secciones del backoffice que todavía no tienen endpoint. Son el contrato esperado: al
 * implementarlos, los hooks de React Query de @discordia/core devuelven esto (como PlatformAccount para usuarios).
 */

export type AccountState = 'active' | 'suspended';

export const ACCOUNT_STATE_LABEL: Record<AccountState, string> = {
  active: 'activo',
  suspended: 'suspendido',
};

/** "2026-10-20T..." → "20/10/2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}
