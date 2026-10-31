import { useSession } from './session';

/**
 * Rol de plataforma (no confundir con los roles de un servidor, admin/roles.ts). Llega en el claim
 * https://discordia.app/role del access token (ROLE_CLAIM, auth/auth0.ts), el mismo que Kong valida con
 * validate("staff") en las rutas de staff. En el cliente solo decide qué interfaz se ve: quien fuerce la
 * pantalla no obtiene nada, porque los datos y las acciones los vuelve a autorizar el Gateway.
 * El backoffice es una app aparte (apps/backoffice, backoffice.discordia.lol); la web solo muestra el link.
 * Reglas para los endpoints del backoffice: Gateway/docs/ADR-002-Rol-Staff-Backoffice.md.
 */

/** Staff de la plataforma: entra al backoffice. */
export const PLATFORM_STAFF_ROLE = 'staff';

export function isPlatformStaff(role: string | null | undefined): boolean {
  return role === PLATFORM_STAFF_ROLE;
}

/** Si el usuario de la sesión es staff de la plataforma (web y mobile). */
export function useIsPlatformStaff(): boolean {
  return useSession((s) => s.status === 'authenticated' && isPlatformStaff(s.role));
}
