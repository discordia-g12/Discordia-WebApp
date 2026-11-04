import * as Linking from 'expo-linking'
import {
  configureAuth,
  databaseSignup,
  decodeJwtPayload,
  getTwoFactorStatus,
  passwordRealmLogin,
  backToLogin,
  loginWithCredentials,
  logout,
  retryBootstrap,
  signupWithCredentials,
  useSession,
  TwoFactorRequiredError,
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
let pendingTwoFactorData: { token: string; user: AuthUser; expiresIn?: number } | null = null

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

    // Si el usuario tiene 2FA activo, requerir el segundo factor antes de otorgar la sesión (CA 2, CA 3, CA 4)
    try {
      const status = await getTwoFactorStatus(accessToken)
      if (status.enabled) {
        throw new TwoFactorRequiredError(accessToken, user)
      }
    } catch (err) {
      if (err instanceof TwoFactorRequiredError) {
        throw err
      }
    }

    session = { token: accessToken, user }
  },

  async completeTwoFactorSession(token: string, user: AuthUser) {
    session = { token, user }
    pendingTwoFactorData = null
    useSession.setState({ pendingTwoFactor: null })
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

/** Inicia el flujo federado de Google en el navegador móvil mediante deep linking. */
export async function loginWithGoogle(): Promise<void> {
  const redirectUrl = Linking.createURL('callback')
  const authUrl =
    `https://${AUTH0_DOMAIN}/authorize?` +
    `client_id=${AUTH0_CLIENT_ID}&` +
    `response_type=token&` +
    `connection=google-oauth2&` +
    `audience=${encodeURIComponent(AUTH0_AUDIENCE)}&` +
    `scope=openid%20profile%20email&` +
    `redirect_uri=${encodeURIComponent(redirectUrl)}`

  await Linking.openURL(authUrl)
}

export async function handleAuthUrl(url: string | null) {
  if (!url) return
  if (url.includes('error=')) {
    useSession.setState({ pendingTwoFactor: null })
    return
  }
  const hashPart = url.split('#')[1] || url.split('?')[1] || ''
  const params = new URLSearchParams(hashPart)
  const token = params.get('access_token')
  if (token) {
    const claims = decodeJwtPayload(token)
    const email =
      (claims?.['https://discordia.app/email'] as string) ||
      (claims?.email as string) ||
      ''
    const nickname =
      (claims?.['https://discordia.app/username'] as string) ||
      (claims?.nickname as string) ||
      (email ? email.split('@')[0] : '') ||
      `user_${Date.now().toString().slice(-4)}`
    const user: AuthUser = {
      sub: claims?.sub as string,
      email,
      nickname,
      name: (claims?.name as string) || nickname,
      picture: claims?.picture as string,
    }

    try {
      const status = await getTwoFactorStatus(token)
      if (status.enabled) {
        pendingTwoFactorData = { token, user }
        useSession.setState({
          status: 'unauthenticated',
          pendingEmail: email,
          pendingTwoFactor: { token, user },
        })
        return
      }
    } catch {
      // Si falla verificar el estado de 2FA, continuar normalmente
    }

    session = { token, user }
    retryBootstrap()
  }
}

// Escuchar retorno del navegador
Linking.addEventListener('url', event => {
  void handleAuthUrl(event.url)
})

Linking.getInitialURL().then(url => {
  if (url) void handleAuthUrl(url)
})

// Las acciones de sesión son las de core (no las del adaptador): además de llamar al adaptador,
// arrancan la sesión con retryBootstrap y manejan el email sin verificar.
export const mobileAuthService = {
  loginWithCredentials,
  signupWithCredentials,
  logout,
  backToLogin,
  retryBootstrap,
  loginWithGoogle,
  savePendingTwoFactor: (data: { token: string; user: AuthUser; expiresIn?: number }) => {
    pendingTwoFactorData = data
    useSession.setState({ pendingTwoFactor: data })
  },
  getPendingTwoFactor: () => pendingTwoFactorData,
  clearPendingTwoFactor: () => {
    pendingTwoFactorData = null
    useSession.setState({ pendingTwoFactor: null })
  },
}
