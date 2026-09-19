/**
 * Contrato abstracto del proveedor de autenticación.
 * Desacopla la lógica interna de la aplicación del SDK específico de identidad (Auth0, Mock, etc.).
 */

export interface AuthUser {
  sub?: string;
  email?: string;
  nickname?: string;
  name?: string;
  picture?: string;
}

export interface AuthProvider {
  /**
   * Obtiene un token de acceso válido en memoria.
   * Si forceRefresh es true, fuerza la renovación ignorando el caché en memoria del SDK.
   */
  getToken(opts?: { forceRefresh?: boolean }): Promise<string>;

  /**
   * Obtiene los datos de perfil básicos provistos por el IdP (email, nickname, picture).
   */
  getUser(): Promise<AuthUser | undefined>;

  /**
   * Procesa la respuesta de callback tras la redirección del proveedor de identidad.
   * Retorna el returnTo original si existía en appState.
   */
  handleCallback(): Promise<{ returnTo?: string }>;

  /**
   * Inicia el flujo de autenticación por redirección.
   * - signup: true para abrir la pantalla de registro (screen_hint=signup).
   * - silent: true para fallback C (prompt=none).
   * - returnTo: ruta a la que volver tras la autenticación.
   * - loginHint: email del usuario para precargar en Auth0.
   */
  loginRedirect(opts?: { signup?: boolean; returnTo?: string; silent?: boolean; loginHint?: string }): Promise<void>;

  /**
   * Cierra la sesión en la aplicación y en el proveedor de identidad.
   */
  logout(): Promise<void>;

  /**
   * Inicia sesión directamente con email y contraseña (flujo integrado sin redirección externa).
   */
  loginWithCredentials(credentials: { email: string; password: string }): Promise<void>;

  /**
   * Registra una nueva cuenta directamente en el proveedor de identidad y autentica al usuario.
   */
  signupWithCredentials(data: {
    email: string;
    password: string;
    username: string;
    displayName?: string;
  }): Promise<void>;
}
