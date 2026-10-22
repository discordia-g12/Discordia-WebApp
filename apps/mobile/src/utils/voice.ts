import { NativeModules, PermissionsAndroid, Platform } from 'react-native'
import { setVoicePlatform } from '@discordia/core'

type LiveKitClient = typeof import('livekit-client')
type LiveKitReactNative = typeof import('@livekit/react-native')

// require en vez de import: un import se resolvería siempre, también en Expo Go
// eslint-disable-next-line @typescript-eslint/no-require-imports
const loadLiveKit = (): LiveKitClient => require('livekit-client')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const loadLiveKitNative = (): LiveKitReactNative => require('@livekit/react-native')

/**
 * true si la app trae compilado el módulo nativo de WebRTC (development build o build de
 * producción). En Expo Go no está: la voz no se puede usar, pero el resto de la app sí.
 *
 * Es el mismo chequeo que hace @livekit/react-native-webrtc al cargarse.
 */
export const isVoiceSupported = NativeModules.WebRTCModule != null

async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true // en iOS lo pide el sistema al abrir el micrófono
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Micrófono',
    message: 'Discordia necesita el micrófono para que puedas hablar en los canales de voz.',
    buttonPositive: 'Permitir',
    buttonNegative: 'Ahora no',
  })
  return result === PermissionsAndroid.RESULTS.GRANTED
}

/**
 * Registra la plataforma de voz de mobile en @discordia/core (la sala es la misma que en la web) y,
 * si la app tiene el módulo nativo, las APIs de WebRTC que usa LiveKit. En Expo Go LiveKit ni
 * siquiera se carga, porque fallaría al no encontrar el módulo nativo.
 *
 * Diferencias con la web: el audio de los demás lo reproduce LiveKit solo, hay que abrir la sesión
 * de audio del teléfono (modo llamada) y en Android el micrófono se pide en tiempo de ejecución.
 * Mute y deafen todavía no se recuerdan entre sesiones (haría falta AsyncStorage).
 */
export function setupVoice(): void {
  setVoicePlatform({
    livekit: loadLiveKit,
    isSupported: () => isVoiceSupported,
    unsupportedMessage: 'La voz no está disponible en esta build (Expo Go)',
    startAudioSession: () => loadLiveKitNative().AudioSession.startAudioSession(),
    stopAudioSession: () => loadLiveKitNative().AudioSession.stopAudioSession(),
    requestMicrophonePermission,
  })

  if (!isVoiceSupported) return
  const { registerGlobals } = loadLiveKitNative()
  registerGlobals()
}
