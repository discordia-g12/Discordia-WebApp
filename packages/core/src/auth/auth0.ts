import type { AuthUser } from './adapter';
import { getAuthConfig } from './config';
import { SignupConflictError, toAuthDenialError } from './errors';

/**
 * Authentication API de Auth0 (login con usuario y contraseña, y registro), igual en web y mobile:
 * solo usa fetch y atob. Los adaptadores de cada plataforma deciden dónde guardar el token.
 */

/** Claim del ID token con el username elegido al registrarse (lo agrega la Auth0 Action). */
export const USERNAME_CLAIM = 'https://discordia.app/username';

export interface PasswordLoginResult {
  accessToken: string;
  /** Segundos de validez del access token. */
  expiresIn: number;
  user: AuthUser;
}

export interface SignupData {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}

/** Claims del payload de un JWT, o null si no se puede leer. No valida la firma: solo para sugerencias. */
export function decodeJwtPayload(token: unknown): Record<string, unknown> | null {
  if (typeof token !== 'string' || typeof atob !== 'function') return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Login con email y contraseña (grant password-realm).
 *
 * Errores posibles:
 *  - EmailNotVerifiedError: credenciales correctas, email sin verificar (deny de la Action).
 *  - AccountSuspendedError: Auth0 denegó el acceso por otro motivo.
 *  - Error genérico de credenciales (CA 2/CA 3 Login) o de Auth0.
 */
export async function passwordRealmLogin(credentials: { email: string; password: string }): Promise<PasswordLoginResult> {
  const { domain, clientId, audience, connection } = getAuthConfig();
  const res = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
      client_id: clientId,
      username: credentials.email,
      password: credentials.password,
      realm: connection,
      audience,
      scope: 'openid profile email',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    // Rechazo de la Auth0 Action. Auth0 solo ejecuta la Action después de
    // validar la contraseña, así que distinguir este caso no permite
    // enumerar cuentas: solo lo ve quien ya ingresó credenciales correctas.
    // Una contraseña incorrecta llega con error "invalid_grant", también 403.
    const denial = toAuthDenialError(data, credentials.email);
    if (denial) throw denial;

    // Criterios de aceptación Login CA 2 y CA 3:
    // Error genérico sin revelar si el fallo fue el email o la contraseña
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error('El correo electrónico o la contraseña son incorrectos.');
    }
    throw new Error(data.error_description || data.error || 'Error al autenticar credenciales.');
  }

  const fallbackName = credentials.email.split('@')[0];
  let user: AuthUser = {
    email: credentials.email,
    nickname: fallbackName,
    name: fallbackName,
  };

  const claims = decodeJwtPayload(data.id_token);
  if (claims) {
    const str = (value: unknown) => (typeof value === 'string' ? value : undefined);
    user = {
      sub: str(claims.sub),
      email: str(claims.email) || credentials.email,
      nickname: str(claims.nickname) || fallbackName,
      name: str(claims.name) || str(claims.nickname) || fallbackName,
      picture: str(claims.picture),
      username: str(claims[USERNAME_CLAIM]),
    };
  }

  return {
    accessToken: data.access_token,
    expiresIn: Number(data.expires_in) || 86400,
    user,
  };
}

/**
 * Crea la cuenta en la conexión de base de datos (/dbconnections/signup). No inicia sesión: el
 * adaptador hace el login después.
 */
export async function databaseSignup(signupData: SignupData): Promise<void> {
  const { domain, clientId, connection } = getAuthConfig();
  const res = await fetch(`https://${domain}/dbconnections/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      email: signupData.email,
      password: signupData.password,
      connection,
      username: signupData.username,
      // La Action devuelve el username en el ID token tras verificar el email
      user_metadata: {
        name: signupData.displayName || signupData.username,
        username: signupData.username,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    // Criterio de Aceptación Registro CA 2: Email o nombre de usuario ya registrado
    if (data.code === 'user_exists') throw new SignupConflictError('email');
    if (data.code === 'username_exists') throw new SignupConflictError('username');
    const descStr = typeof data.description === 'string' ? data.description.toLowerCase() : '';
    if (
      data.code === 'invalid_signup' ||
      descStr.includes('sign up') ||
      descStr.includes('already exists') ||
      descStr.includes('already registered')
    ) {
      throw new SignupConflictError(null);
    }

    // Criterio de Aceptación Registro CA 4: Contraseña insegura
    if (data.name === 'PasswordStrengthError') {
      const minLength =
        data.description?.rules?.find((r: any) => r.code === 'lengthAtLeast')?.format?.[0] || 8;
      throw new Error(
        `La contraseña debe tener al menos ${minLength} caracteres, mayúscula, minúscula y número.`
      );
    }

    throw new Error(
      (typeof data.description === 'string' && data.description) || data.message || 'Error al crear la cuenta.'
    );
  }
}
