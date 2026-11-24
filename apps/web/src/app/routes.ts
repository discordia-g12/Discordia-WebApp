/**
 * Las URLs que la web entiende. No hay librería de rutas: lo que se mira está en useUIStore, y la URL solo
 * importa al entrar. Cloudflare Pages y nginx devuelven index.html para cualquier ruta, así que lo que no
 * está acá lo resuelve la página de "no encontrada" (sin esto, cualquier link roto abría la app igual).
 *
 * - `/`: la app.
 * - `/login`: el acceso. Ahí vuelve Auth0 al cerrar sesión, y ahí espera el segundo factor (platform/auth/auth0.ts).
 * - `/invite/<código>`: abre "unirse a un servidor" con ese código (App.tsx, serverActions.ts).
 * - `/callback`: la vuelta de Auth0 después de entrar con Google (platform/auth/auth0.ts).
 */
export function isKnownPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/' || path === '/login' || path === '/callback' || /^\/invite\/[^/]+$/.test(path);
}
