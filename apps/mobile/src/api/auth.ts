import {
  configureAuth,
  databaseSignup,
  passwordRealmLogin,
  type AuthAdapter,
  type AuthUser,
  type UserProfile,
} from '@discordia/core'
import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_CONNECTION, AUTH0_DOMAIN } from '../utils/config'

// La configuración de Auth0 entra a core desde acá (variables EXPO_PUBLIC_*)
configureAuth({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  audience: AUTH0_AUDIENCE,
  connection: AUTH0_CONNECTION,
})

/** Perfil de Auth-User-Service: el mismo tipo que usa la web. */
export type BackendProfile = UserProfile

// La sesión vive en memoria: al cerrar la app hay que volver a iniciar sesión.
let session: { token: string; user: AuthUser } | null = null

/** Token de la sesión actual. Lo usan los WebSockets (van con el token en la URL). */
export function getCurrentToken(): string | null {
  return session?.token ?? null
}

/**
 * Adaptador de autenticación de mobile: login y registro con la Authentication API de Auth0 (core),
 * sin redirecciones. La máquina de estados de la sesión es la de @discordia/core.
 */
export const mobileAuthAdapter: AuthAdapter = {
  async getToken() {
    if (!session) throw new Error('login_required')
    return session.token
  },

  async getUser() {
    return session?.user
  },

  async loginWithCredentials(credentials) {
    // Sin la sesión anterior: si este login falla, no tiene que quedar el token de otra cuenta
    session = null
    const { accessToken, user } = await passwordRealmLogin(credentials)
    session = { token: accessToken, user }
  },

  async signupWithCredentials(data) {
    session = null
    await databaseSignup(data)
    // Login automático tras registro exitoso (lanza EmailNotVerifiedError si falta verificar el email)
    await mobileAuthAdapter.loginWithCredentials({ email: data.email, password: data.password })
  },

  async logout() {
    session = null
  },
}
