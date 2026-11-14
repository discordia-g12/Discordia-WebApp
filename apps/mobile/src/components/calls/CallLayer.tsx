import React from 'react'
import { Modal as RNModal, Pressable, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronDown, Headphones, HeadphoneOff, Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react-native'
import type { useVoiceRoom } from '@discordia/core'
import { useCallStatusLine, type CallPeer, type PrivateCallSession } from '../../hooks/usePrivateCallSession'
import { makeStyles, useTheme } from '../../theme'
import { ActionLink, Background, BlockButton, SquareAvatar, Text } from '../../ui'
import ConfirmModal from '../shared/ConfirmModal'
import { CallBar } from '../shell/CallBar'
import ParticipantVideo from '../voice/ParticipantVideo'
import { SpeakingBorder } from '../voice/VoiceScreen'

type VoiceRoom = ReturnType<typeof useVoiceRoom>

interface CallLayerProps {
  session: PrivateCallSession
  voice: VoiceRoom
  /** Nombre del canal de voz de servidor en el que está (aceptar o llamar lo saca de ahí). */
  voiceChannelName?: string
  /** Prende o apaga la cámara (#54); sin esta función no hay botón (sin WebRTC nativo, p. ej. Expo Go). */
  onToggleCamera?: () => void
}

/**
 * La llamada privada encima de toda la app: la entrante (quién llama, atender y rechazar) y la pantalla de
 * la llamada (llamando…, conectando, la duración, quién habla, micrófono, audio y cortar). Las dos van en el
 * mismo modal a pantalla completa, así atender no cierra uno para abrir otro. También pide confirmar una
 * llamada hecha desde un canal de voz de servidor.
 */
export function CallLayer({ session, voice, voiceChannelName, onToggleCamera }: CallLayerProps) {
  const styles = useStyles()
  const { state, viewOpen, pendingCall } = session
  const incoming = state.status === 'incoming'
  const showCall = viewOpen && (state.status === 'outgoing' || state.status === 'active' || state.status === 'ended')
  const visible = incoming || showCall
  const channel = voiceChannelName ? `•${voiceChannelName}` : 'el canal de voz'

  return (
    <>
      <RNModal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        // Atrás de Android: la entrante sigue sonando (se rechaza con el botón); la llamada se minimiza
        onRequestClose={incoming ? () => undefined : session.minimize}
      >
        <View style={styles.screen}>
          <Background />
          <SafeAreaView style={styles.screen}>
            {incoming ? (
              <IncomingCall session={session} channel={voice.channelId ? channel : null} />
            ) : showCall ? (
              <CallView session={session} voice={voice} onToggleCamera={onToggleCamera} />
            ) : null}
          </SafeAreaView>
        </View>
      </RNModal>
      <ConfirmModal
        visible={!!pendingCall}
        title={`¿Llamar a ${pendingCall?.name ?? ''}?`}
        message={`Estás conectado a ${channel}. Si llamás, salís de ese canal.`}
        confirmLabel="Llamar"
        onCancel={session.cancelPendingCall}
        onConfirm={session.confirmPendingCall}
      />
    </>
  )
}

/** Llamada entrante: quién llama, rechazar y atender. Sin voz en la build (Expo Go) se puede rechazar igual. */
function IncomingCall({ session, channel }: { session: PrivateCallSession; channel: string | null }) {
  const styles = useStyles()
  const { state, peer, supported } = session
  const accepting = state.status === 'incoming' && state.accepting

  return (
    <View style={styles.screen} accessibilityViewIsModal accessibilityLabel={`Llamada entrante de ${peer.name}`}>
      <View style={styles.center}>
        <PeerAvatar peer={peer} />
        <Text variant="heading" numberOfLines={2} style={styles.name}>
          {peer.name}
        </Text>
        <Text variant="bodySmall" tone="muted" accessibilityLiveRegion="polite">
          {accepting ? 'conectando/' : 'te está llamando/'}
        </Text>
        {channel && supported && (
          <Text variant="meta" tone="muted" style={styles.hint}>
            Si atendés, salís de {channel}.
          </Text>
        )}
        {!supported && (
          <Text variant="meta" tone="muted" style={styles.hint}>
            {session.unsupportedMessage}
          </Text>
        )}
      </View>
      <View style={styles.answers}>
        <BlockButton tone="danger" disabled={accepting} onPress={session.decline}>
          rechazar
        </BlockButton>
        {supported && (
          <BlockButton loading={accepting} onPress={session.accept}>
            atender
          </BlockButton>
        )}
      </View>
    </View>
  )
}

/**
 * La llamada en curso (o cómo terminó, un momento): el otro, el estado y los controles. Con la cámara del
 * otro prendida (#54) su video ocupa el centro; la propia va en un recuadro chico, en espejo.
 */
function CallView({ session, voice, onToggleCamera }: { session: PrivateCallSession; voice: VoiceRoom; onToggleCamera?: () => void }) {
  const styles = useStyles()
  const { colors } = useTheme()
  const { state, peer, endedText } = session
  const status = useCallStatusLine(state, voice.connectionState)
  const ended = state.status === 'ended'
  // En la sala de la llamada hay dos: el otro es el que no es local
  const remote = voice.participants.find(p => !p.isLocal)
  const local = voice.participants.find(p => p.isLocal)
  const MicIcon = voice.isMuted ? MicOff : Mic
  const AudioIcon = voice.isDeafened ? HeadphoneOff : Headphones
  const CameraIcon = voice.isCameraOn ? Video : VideoOff
  const remoteVideo = !ended ? (remote?.videoTrack ?? null) : null
  const localVideo = !ended ? (local?.videoTrack ?? null) : null
  // La cámara se publica en la sala: con la conexión establecida y si el token la deja (Voice anterior: no)
  const cameraUsable = voice.connectionState === 'connected' && voice.canVideo

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        {!ended && (
          <Pressable
            style={styles.minimize}
            onPress={session.minimize}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Minimizar la llamada"
          >
            <ChevronDown color={colors.text} size={16} strokeWidth={1.5} />
            <Text variant="bodySmall" bold>
              minimizar
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.center}>
        {remoteVideo ? (
          <View style={styles.remoteVideo} accessibilityLabel={`${peer.name}, con cámara${remote?.isSpeaking ? ', hablando' : ''}`}>
            <ParticipantVideo track={remoteVideo} style={styles.fill} />
            {remote?.isSpeaking && <SpeakingBorder />}
          </View>
        ) : (
          <PeerAvatar peer={peer} speaking={!!remote?.isSpeaking} />
        )}
        {localVideo && (
          <View style={styles.localVideo} accessibilityLabel="Tu cámara">
            <ParticipantVideo track={localVideo} mirrored style={styles.fill} />
          </View>
        )}
        <Text variant="heading" numberOfLines={2} style={styles.name}>
          {peer.name}
        </Text>
        <Text variant="bodySmall" tone="muted" accessibilityLiveRegion={ended ? 'polite' : 'none'}>
          {ended ? endedText : `${status}/`}
        </Text>
        {!ended && remote?.isMuted && (
          <Text variant="meta" tone="muted">
            tiene el micrófono silenciado
          </Text>
        )}
        {!ended && local?.isSpeaking && (
          <Text variant="meta" tone="muted">
            estás hablando
          </Text>
        )}
      </View>

      {ended ? (
        <View style={styles.answers}>
          <ActionLink size="bodySmall" onPress={session.closeEnded}>
            cerrar
          </ActionLink>
        </View>
      ) : (
        <View style={styles.controls}>
          <Pressable
            style={styles.control}
            onPress={voice.toggleMute}
            accessibilityRole="button"
            accessibilityLabel={voice.isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
            accessibilityState={{ selected: voice.isMuted }}
          >
            <MicIcon color={colors.text} size={22} strokeWidth={1.5} />
          </Pressable>
          <Pressable
            style={styles.control}
            onPress={voice.toggleDeafen}
            accessibilityRole="button"
            accessibilityLabel={voice.isDeafened ? 'Activar audio' : 'Desactivar audio'}
            accessibilityState={{ selected: voice.isDeafened }}
          >
            <AudioIcon color={colors.text} size={22} strokeWidth={1.5} />
          </Pressable>
          {onToggleCamera && (
            <Pressable
              style={[styles.control, voice.isCameraOn && styles.active, !cameraUsable && styles.disabled]}
              onPress={onToggleCamera}
              disabled={!cameraUsable}
              accessibilityRole="button"
              accessibilityLabel={voice.isCameraOn ? 'Apagar cámara' : 'Prender cámara'}
              accessibilityState={{ selected: voice.isCameraOn, disabled: !cameraUsable }}
            >
              <CameraIcon color={voice.isCameraOn ? colors.inverseText : colors.text} size={22} strokeWidth={1.5} />
            </Pressable>
          )}
          <Pressable style={[styles.control, styles.hangUp]} onPress={session.hangUp} accessibilityRole="button" accessibilityLabel="Cortar la llamada">
            <PhoneOff color={colors.onDanger} size={22} strokeWidth={1.5} />
          </Pressable>
        </View>
      )}
    </View>
  )
}

function PeerAvatar({ peer, speaking = false }: { peer: CallPeer; speaking?: boolean }) {
  const styles = useStyles()
  return (
    <View style={styles.avatar} accessibilityLabel={speaking ? `${peer.name}, hablando` : undefined}>
      <SquareAvatar user={{ username: peer.name, displayName: peer.name, avatar: peer.avatar }} size="lg" />
      {speaking && <SpeakingBorder />}
    </View>
  )
}

/**
 * La llamada privada en la barra de abajo, en cualquier pestaña, con la pantalla de la llamada cerrada: con
 * quién, el estado, micrófono, audio y cortar. Tocarla vuelve a la llamada.
 */
export function PrivateCallBar({
  session,
  voice,
  onToggleCamera,
}: {
  session: PrivateCallSession
  voice: VoiceRoom
  onToggleCamera?: () => void
}) {
  const { state, peer, viewOpen } = session
  const status = useCallStatusLine(state, voice.connectionState)
  if (viewOpen || (state.status !== 'outgoing' && state.status !== 'active')) return null
  return (
    <CallBar
      direct
      channelName={peer.name}
      status={status ?? undefined}
      connectionState={voice.connectionState}
      isMuted={voice.isMuted}
      isDeafened={voice.isDeafened}
      onOpen={session.openView}
      onToggleMute={voice.toggleMute}
      onToggleDeafen={voice.toggleDeafen}
      onDisconnect={session.hangUp}
      isCameraOn={voice.isCameraOn}
      onToggleCamera={voice.canVideo ? onToggleCamera : undefined}
    />
  )
}

const useStyles = makeStyles(t => ({
  screen: { flex: 1 },
  top: { height: t.space[7], justifyContent: 'center', paddingHorizontal: t.space[4] },
  minimize: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], alignSelf: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.space[2], paddingHorizontal: t.space[5] },
  avatar: { marginBottom: t.space[3] },
  name: { textAlign: 'center' },
  hint: { textAlign: 'center', marginTop: t.space[3] },
  answers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space[5],
    paddingVertical: t.space[6],
    paddingHorizontal: t.space[5],
  },
  // Los mismos bloques que la barra de la llamada, separados por líneas finas
  controls: {
    flexDirection: 'row',
    height: t.layout.userBarHeight,
    borderTopWidth: t.lines.hairline,
    borderTopColor: t.colors.lineStrong,
    backgroundColor: t.colors.line,
  },
  control: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: t.lines.hairline,
    borderLeftColor: t.colors.lineStrong,
  },
  hangUp: { backgroundColor: t.colors.danger },
  // Cámara prendida: el bloque invertido, como en la barra de la llamada
  active: { backgroundColor: t.colors.inverseBackground },
  disabled: { opacity: 0.4 },
  // Video del otro: ocupa el ancho, 3:4 como la cámara de un teléfono; la propia, un recuadro arriba a la derecha
  remoteVideo: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    backgroundColor: t.colors.inverseBackground,
    marginBottom: t.space[3],
  },
  localVideo: {
    position: 'absolute',
    top: t.space[2],
    right: t.space[4],
    width: 96,
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    backgroundColor: t.colors.inverseBackground,
    borderWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
  },
  fill: { flex: 1 },
}))
