import { getApiBaseUrl } from './config'

let currentAuthToken: string | null = null

export function setAuthToken(token: string | null) {
  currentAuthToken = token
}

export function getAuthToken(): string | null {
  return currentAuthToken
}

/** Error lanzado por apiFetch ante una respuesta HTTP no exitosa. */
export type ApiFetchError = Error & {
  status: number
  /** RFC 7807 `type` si el backend lo envió ("about:blank" = sin semántica extra). */
  type?: string
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: any
  timeoutMs?: number
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const cleanBase = baseUrl.replace(/\/$/, '')
  const cleanPath = endpoint.replace(/^\//, '')
  const url = `${cleanBase}/${cleanPath}`

  const { body, timeoutMs = 12000, headers: customHeaders, ...rest } = options

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  }

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...rest,
      headers,
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      let errorMessage = `HTTP Error ${res.status}`
      let problemType: string | undefined
      try {
        const errorData = await res.json()
        errorMessage =
          errorData.detail || errorData.message || errorData.error || errorMessage
        if (typeof errorData.type === 'string') problemType = errorData.type
      } catch {
        const text = await res.text()
        if (text) errorMessage = text
      }
      const err = new Error(errorMessage) as ApiFetchError
      err.status = res.status
      err.type = problemType
      throw err
    }

    if (res.status === 204) {
      return {} as T
    }

    const data = await res.json()
    return data as T
  } catch (error: any) {
    clearTimeout(timer)
    if (error.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al conectar con el servidor.')
    }
    throw error
  }
}

