import {
  AUTH0_DOMAIN,
  AUTH0_CLIENT_ID,
  AUTH0_AUDIENCE,
  AUTH0_CONNECTION,
} from './config'
import { apiFetch, setAuthToken } from './client'

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
  const res = await apiFetch<any>('/api/v1/users/me')
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
  const res = await apiFetch<any>('/api/v1/users/me', {
    method: 'POST',
    body: {
      username: cleanUsername,
      display_name: data.display_name || data.username,
      avatar_url: data.avatar_url,
      bio: data.bio,
    },
  })
  return {
    ...res,
    id: res.user_id || res.id,
    display_name: res.display_name || res.username,
    avatar_url: res.avatar_url || res.avatar || null,
  }
}

/**
 * Autentica al usuario contra Auth0.
 */
export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
      client_id: AUTH0_CLIENT_ID,
      username: email.trim(),
      password,
      realm: AUTH0_CONNECTION,
      audience: AUTH0_AUDIENCE,
      scope: 'openid profile email',
    }),
  })

  const data = await res.json()
  if (!res.ok) {
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
      const fallbackName = email.split('@')[0]
      profile = await upsertMyProfile({
        username: fallbackName,
        display_name: fallbackName,
      })
    } else {
      // Si el backend Gateway no está alcanzable temporalmente, usamos un perfil derivado
      const fallbackName = email.split('@')[0]
      profile = {
        id: `usr-${fallbackName}`,
        username: fallbackName,
        display_name: fallbackName,
        email,
      }
    }
  }

  return { token, profile }
}

/**
 * Crea una nueva cuenta en Auth0 mediante la API de base de datos (/dbconnections/signup),
 * y posteriormente inicia sesión automáticamente.
 */
export async function signupWithCredentials(
  username: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_.-]/g, '_').slice(0, 32)

  const res = await fetch(`https://${AUTH0_DOMAIN}/dbconnections/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      email: email.trim(),
      password,
      connection: AUTH0_CONNECTION,
      username: cleanUsername,
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

