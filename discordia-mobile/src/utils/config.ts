import Constants from 'expo-constants'
import { Platform } from 'react-native'

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL
  }
  const hostUri = Constants.expoConfig?.hostUri
  const hostIp = hostUri ? hostUri.split(':')[0] : null
  if (Platform.OS === 'web') return 'http://localhost:8000'
  if (Platform.OS === 'android') return hostIp ? `http://${hostIp}:8000` : 'http://10.0.2.2:8000'
  return hostIp ? `http://${hostIp}:8000` : 'http://localhost:8000'
}

export function getWsBaseUrl(): string {
  const httpUrl = getApiBaseUrl()
  return httpUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
}
export const AUTH0_DOMAIN =
  (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_AUTH0_DOMAIN) || 'dev-dppme5iaqg60gkmo.us.auth0.com'
export const AUTH0_CLIENT_ID =
  (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID) || 'f2H8PhlKDl3KSIm64G5mHAeQih7iFyIP'
export const AUTH0_AUDIENCE =
  (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_AUTH0_AUDIENCE) || 'https://api.discordia.com'
export const AUTH0_CONNECTION = 'Username-Password-Authentication'
