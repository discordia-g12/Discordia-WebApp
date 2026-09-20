import Constants from 'expo-constants'
import { Platform } from 'react-native'

export const AUTH0_DOMAIN =
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'dev-dppme5iaqg60gkmo.us.auth0.com'
export const AUTH0_CLIENT_ID =
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || 'f2H8PhlKDl3KSIm64G5mHAeQih7iFyIP'
export const AUTH0_AUDIENCE =
  process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || 'https://api.discordia.com'
export const AUTH0_CONNECTION = 'Username-Password-Authentication'

/**
 * Resuelve la URL base del Gateway (:8000) considerando si corre en:
 * - Web o iOS Simulator (localhost)
 * - Android Emulator (10.0.2.2)
 * - Teléfono físico vía Expo Go (IP local de la computadora tomada de hostUri)
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL

  // Si hay hostUri en Expo Go (ej. 192.168.1.50:8081), extraemos la IP del host
  const hostUri = Constants.expoConfig?.hostUri
  const hostIp = hostUri ? hostUri.split(':')[0] : null

  if (Platform.OS === 'web') {
    return envUrl || 'http://localhost:8000'
  }

  if (Platform.OS === 'android') {
    // Si no está corriendo en Expo Go con hostUri, usa 10.0.2.2 para emulador Android
    if (hostIp) {
      return `http://${hostIp}:8000`
    }
    return 'http://10.0.2.2:8000'
  }

  // iOS / default
  if (hostIp) {
    return `http://${hostIp}:8000`
  }

  return envUrl || 'http://localhost:8000'
}

