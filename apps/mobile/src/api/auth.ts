import {
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  AUTH0_AUDIENCE,
  AUTH0_CONNECTION,
} from '../utils/config'
import { Platform } from 'react-native'
import { api, configureClient } from '@discordia/core'
import { getApiBaseUrl } from '../utils/config'

// Guardamos el token acá también porque la subida del avatar usa XMLHttpRequest directo (multipart).
let currentToken: string | null = null
export const setAuthToken = (token: string | null) => {
  currentToken = token
  configureClient({ getToken: async () => token || '' })
}
import { isProblemType, PROBLEM_TYPES, toAuthDenialError, EmailNotVerifiedError } from './authErrors'

export interface BackendProfile {
  id: string
  user_id?: string
  username: string
  display_name?: string
  bio?: string
  avatar_url?: string | null
  email?: string
  activity_status?: string
  custom_status?: string
  created_at?: string
}

export interface AuthSession {
  token: string
  profile: BackendProfile
}

/**
 * Consulta el perfil del usuario autenticado en Auth-User-Service vía Kong Gateway.
 */
export async function getMyProfile(): Promise<BackendProfile> {
  const res = await api.get<any>('/api/v1/users/me')
  return {
    ...res,
    id: res.user_id || res.id,
    display_name: res.display_name || res.username,
    avatar_url: res.avatar_url || res.avatar || null,
  }
}

/**
 * Registra o actualiza el perfil en Auth-User-Service si aún no existe.
 */
export async function upsertMyProfile(data: {
  username: string
  display_name?: string
  bio?: string
  avatar_url?: string
}): Promise<BackendProfile> {
  // Limpieza de caracteres no permitidos en username
  const cleanUsername = data.username.toLowerCase().replace(/[^a-z0-9_.-]/g, '_').slice(0, 32)
  const res = await api.post<any>('/api/v1/users/me', {
    username: cleanUsername,
    display_name: data.display_name || data.username,
    avatar_url: data.avatar_url,
    bio: data.bio,
  })
  return {
    ...res,
    id: res.user_id || res.id,
    display_name: res.display_name || res.username,
    avatar_url: res.avatar_url || res.avatar || null,
  }
}

/**
 * Pide el email de recupero de contraseña (POST /api/v1/auth/password-reset, público; ADR-006).
 *
 * El backend responde 202 con el mismo mensaje exista o no la cuenta (CA4). Errores de apiFetch
 * (con `status`):
 *  - 422: formato de email inválido.
 *  - 429: demasiados pedidos (límite por email del servicio o por IP de Kong).
 *  - 503: Auth0 no disponible.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/api/v1/auth/password-reset', { email: email.trim() }, { skipAuth: true })
}

/** Claim del ID token con el username elegido al registrarse (lo agrega la Auth0 Action). */
const USERNAME_CLAIM = 'https://discordia.app/username'

function sanitizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_.-]/g, '_').slice(0, 32)
}

/**
 * Lee el username sugerido del ID token. Solo se usa como sugerencia para crear
 * el perfil
 */
function usernameFromIdToken(idToken: unknown): string | undefined {
  if (typeof idToken !== 'string' || typeof atob !== 'function') return undefined
  try {
    const part = idToken.split('.')[1]
    if (!part) return undefined
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))
    const value = payload?.[USERNAME_CLAIM]
    return typeof value === 'string' && value.length > 0 ? value : undefined
  } catch {
    return undefined
  }
}

/** true si el error es de conectividad (timeout / sin red), no una respuesta HTTP del backend. */
function isNetworkError(err: any): boolean {
  return err?.status === undefined
}

/**
 * Autentica al usuario contra Auth0.
 *
 * Errores posibles:
 *  - EmailNotVerifiedError: credenciales correctas, email sin verificar (deny de la Action).
 *  - AccountSuspendedError: Auth0 denegó el acceso por otro motivo.
 *  - Error genérico de credenciales (CA 2/CA 3 Login) o de conexión.
 */
export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<AuthSession> {
  const cleanEmail = email.trim()
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
      client_id: AUTH0_CLIENT_ID,
      username: cleanEmail,
      password,
      realm: AUTH0_CONNECTION,
      audience: AUTH0_AUDIENCE,
      scope: 'openid profile email',
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    // Rechazo de la Auth0 Action. Auth0 ejecuta la Action solo después de validar
    // la contraseña, así que distinguir este caso no permite enumerar cuentas.
    const denial = toAuthDenialError(data, cleanEmail)
    if (denial) throw denial

    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error('El correo electrónico o la contraseña son incorrectos.')
    }
    throw new Error(data.error_description || data.error || 'Error al autenticar credenciales.')
  }

  const token: string = data.access_token
  setAuthToken(token)

  // Consultar perfil en backend o crearlo si no existe
  let profile: BackendProfile
  try {
    profile = await getMyProfile()
  } catch (err: any) {
    if (err?.status === 404 || err?.message?.includes('404')) {
      // Prioridad del username: el elegido al registrarse (claim del ID token, sobrevive a
      // verificar el mail en otro dispositivo) > derivado del email.
      const username = usernameFromIdToken(data.id_token) || cleanEmail.split('@')[0]
      try {
        profile = await upsertMyProfile({ username, display_name: username })
      } catch (provisionErr: any) {
        // Segunda barrera: el backend rechaza crear el perfil si el email no está verificado.
        setAuthToken(null)
        if (isProblemType(provisionErr, PROBLEM_TYPES.EMAIL_NOT_VERIFIED)) {
          throw new EmailNotVerifiedError(cleanEmail)
        }
        throw provisionErr
      }
    } else if (isNetworkError(err)) {
      // Gateway temporalmente inalcanzable: se entra con un perfil derivado.
      // Solo ante fallos de conectividad: una respuesta HTTP de error (401/403/5xx)
      // no debe dejar entrar al usuario con una identidad inventada.
      const fallbackName = cleanEmail.split('@')[0]
      profile = {
        id: `usr-${fallbackName}`,
        username: fallbackName,
        display_name: fallbackName,
        email: cleanEmail,
      }
    } else {
      setAuthToken(null)
      throw err
    }
  }

  return { token, profile }
}

/**
 * Crea una nueva cuenta en Auth0 mediante la API de base de datos (/dbconnections/signup),
 * y posteriormente inicia sesión automáticamente (pantalla de verificación)
 */
export async function signupWithCredentials(
  username: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const cleanUsername = sanitizeUsername(username)

  const res = await fetch(`https://${AUTH0_DOMAIN}/dbconnections/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      email: email.trim(),
      password,
      connection: AUTH0_CONNECTION,
      username: cleanUsername,
      user_metadata: {
        name: username,
        username: cleanUsername,
      },
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    // Manejo de contraseña débil devuelto por Auth0
    if (data.name === 'PasswordStrengthError') {
      const minLength =
        data.description?.rules?.find((r: any) => r.code === 'lengthAtLeast')?.format?.[0] || 8
      throw new Error(
        `La contraseña debe tener al menos ${minLength} caracteres, mayúscula, minúscula y número.`
      )
    }

    const rawError =
      typeof data.description === 'string'
        ? data.description
        : typeof data.message === 'string'
          ? data.message
          : typeof data.error === 'string'
            ? data.error
            : ''

    const errorMsg = rawError.toLowerCase()
    if (
      res.status === 400 &&
      (data.code === 'user_exists' ||
        data.code === 'invalid_signup' ||
        errorMsg.includes('already exists') ||
        errorMsg.includes('already registered') ||
        errorMsg.includes('sign up'))
    ) {
      throw new Error('El correo o nombre de usuario ya está en uso.')
    }
    throw new Error(rawError || 'No se pudo completar el registro.')
  }

  // Login automático tras registro exitoso
  const session = await loginWithCredentials(email, password)

  // Asegurar que el perfil quede guardado en el backend con el username elegido
  try {
    const updatedProfile = await upsertMyProfile({
      username: cleanUsername,
      display_name: username,
    })
    session.profile = updatedProfile
  } catch {
    // Si ya existía o falló el upsert, se continúa con el perfil actual
  }

  return session
}


export async function updateMyProfile(payload: {
  display_name?: string
  avatar_url?: string
  bio?: string
  custom_status?: string
}): Promise<BackendProfile> {
  const res = await api.patch<any>('/api/v1/users/me/profile', payload)
  return res as BackendProfile
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
  const authToken = token || currentToken
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