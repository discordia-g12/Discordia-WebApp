import React from 'react'
import type { ViewStyle } from 'react-native'
import type { VideoTrack } from 'livekit-client'

type LiveKitReactNative = typeof import('@livekit/react-native')

interface ParticipantVideoProps {
  track: VideoTrack
  /** La cámara propia se muestra en espejo. */
  mirrored?: boolean
  style?: ViewStyle
}

/**
 * Cámara de un participante llenando su ficha. Solo se renderiza con un track de video, que solo
 * existe si la app tiene WebRTC nativo: por eso @livekit/react-native se carga recién acá (con un
 * import arriba se cargaría también en Expo Go, donde no está el módulo nativo).
 *
 * Usa VideoView (recibe el track directo); VideoTrack, su reemplazo, pide una TrackReference de
 * @livekit/components-react que la sala compartida no expone.
 */
export default function ParticipantVideo({ track, mirrored = false, style }: ParticipantVideoProps) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { VideoView } = require('@livekit/react-native') as LiveKitReactNative
  return <VideoView videoTrack={track} objectFit="cover" mirror={mirrored} style={style} />
}
