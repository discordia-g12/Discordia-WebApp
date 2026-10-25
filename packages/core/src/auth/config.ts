/**
 * Configuración de Auth0. Cada app la carga al arrancar con sus variables de entorno (la web con
 * VITE_AUTH0_*, mobile con EXPO_PUBLIC_AUTH0_*): core no lee variables de entorno.
 * Son valores públicos (van en el bundle), no secretos.
 */
export interface AuthConfig {
  domain: string;
  clientId: string;
  audience: string;
  /** Conexión de base de datos de Auth0 (usuario y contraseña). */
  connection: string;
}

let authConfig: AuthConfig | null = null;

export function configureAuth(config: Omit<AuthConfig, 'connection'> & Partial<Pick<AuthConfig, 'connection'>>): void {
  authConfig = { connection: 'Username-Password-Authentication', ...config };
}

export function getAuthConfig(): AuthConfig {
  if (!authConfig) {
    throw new Error('Auth0 sin configurar: llamar a configureAuth() al arrancar la app.');
  }
  return authConfig;
}
