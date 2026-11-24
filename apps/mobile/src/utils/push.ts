import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { registerPushDevice, unregisterPushDevice } from '@discordia/core'

/** Cuánto espera el cierre de sesión al DELETE del token antes de seguir igual. */
export const UNREGISTER_TIMEOUT_MS = 3_000

/** En primer plano no se muestra nada: la bandeja ya avisa (ADR-08). */
export function hideForegroundNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
}

// El token registrado en esta sesión: el que se borra al cerrarla
let registeredToken: string | null = null

/**
 * Pide permiso (si todavía se puede preguntar), saca el Expo push token y lo registra en el backend.
 * null si no hay permiso o no es iOS/Android. Lanza si no se puede sacar el token (simulador, Android sin FCM).
 */
export async function registerForPush(): Promise<string | null> {
  const platform = Platform.OS
  if (platform !== 'ios' && platform !== 'android') return null
  const current = await Notifications.getPermissionsAsync()
  let status = current.status
  if (status !== 'granted' && current.canAskAgain) ({ status } = await Notifications.requestPermissionsAsync())
  if (status !== 'granted') return null
  // El projectId sale de app.json (extra.eas.projectId)
  const { data: token } = await Notifications.getExpoPushTokenAsync()
  await registerPushDevice({ platform, token })
  registeredToken = token
  return token
}

/** Borra el token del backend. Va antes de cerrar sesión (usa el JWT) y nunca lanza: el cierre sigue igual. */
export async function unregisterFromPush(): Promise<void> {
  const token = registeredToken
  if (!token) return
  registeredToken = null
  await unregisterPushDevice(token, { timeoutMs: UNREGISTER_TIMEOUT_MS }).catch(() => {})
}
