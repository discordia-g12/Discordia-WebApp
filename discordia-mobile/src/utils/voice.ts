import { NativeModules } from 'react-native'

/**
 * true si la app trae compilado el módulo nativo de WebRTC (development build o build de
 * producción). En Expo Go no está: la voz no se puede usar, pero el resto de la app sí.
 *
 * Es el mismo chequeo que hace @livekit/react-native-webrtc al cargarse.
 */
export const isVoiceSupported = NativeModules.WebRTCModule != null

/**
 * Registra las APIs de WebRTC que usa LiveKit. Sin efecto en Expo Go: ahí el paquete ni siquiera
 * se carga, porque fallaría al no encontrar el módulo nativo.
 */
export function setupVoice(): void {
  if (!isVoiceSupported) return
  // require en vez de import: un import se resolvería siempre, también en Expo Go
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerGlobals } = require('@livekit/react-native')
  registerGlobals()
}
