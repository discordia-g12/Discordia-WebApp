import { Platform } from 'react-native'
import {
  configureAuth,
  databaseSignup,
  passwordRealmLogin,
  type AuthAdapter,
  type AuthUser,
  type UserProfile,
} from '@discordia/core'
import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_CONNECTION, AUTH0_DOMAIN, getApiBaseUrl } from '../utils/config'

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

/**
 * Token de la sesión actual. Lo usan los WebSockets (van con el token en la URL) y la subida del
 * avatar (XMLHttpRequest directo, multipart).
 */
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
    const { accessToken, user } = await passwordRealmLogin(credentials)
    session = { token: accessToken, user }
  },

  async signupWithCredentials(data) {
    await databaseSignup(data)
    // Login automático tras registro exitoso (lanza EmailNotVerifiedError si falta verificar el email)
    await mobileAuthAdapter.loginWithCredentials({ email: data.email, password: data.password })
  },

  async logout() {
    session = null
  },
}

export interface PickedImage {
  uri: string
  mimeType?: string | null
  fileName?: string | null
}

/**
 * Sube el avatar como multipart/form-data a PATCH /profile/avatar (campo "file").
 * OJO: no se setea Content-Type a mano; XMLHttpRequest le agrega el boundary solo.
 */
export async function uploadMyAvatar(image: PickedImage, token?: string | null): Promise<BackendProfile> {
  const authToken = token || getCurrentToken()
  if (!authToken) throw new Error('No hay sesión activa. Volvé a iniciar sesión.')

  const mime = image.mimeType || 'image/jpeg'
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  const name = image.fileName || `avatar.${ext}`

  const form = new FormData()
  if (Platform.OS === 'web') {
    const blob = await (await fetch(image.uri)).blob()
    form.append('file', blob, name)
  } else {
    form.append('file', { uri: image.uri, name, type: mime } as any)
  }

  // XMLHttpRequest en vez de fetch: el fetch global de Expo rechaza el { uri, name, type }
  // de React Native con "Unsupported FormDataPart implementation".
  const { status, data } = await new Promise<{ status: number; data: any }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PATCH', `${getApiBaseUrl()}/api/v1/users/me/profile/avatar`)
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.onload = () => {
      let body: any = {}
      try { body = JSON.parse(xhr.responseText) } catch { }
      resolve({ status: xhr.status, data: body })
    }
    xhr.onerror = () => reject(new Error('Error de red al subir la imagen.'))
    xhr.ontimeout = () => reject(new Error('Se agotó el tiempo al subir la imagen.'))
    xhr.timeout = 30000
    xhr.send(form as any)
  })

  if (status < 200 || status >= 300) {
    const err: any = new Error(
      (typeof data?.detail === 'string' && data.detail) || data?.title || 'No se pudo subir la imagen.',
    )
    err.status = status
    throw err
  }
  return {
    ...data,
    id: data.user_id || data.id,
    display_name: data.display_name || data.username,
    avatar_url: data.avatar_url || data.avatar || null,
  }
}
