import React, { useState } from 'react'
import { Modal as RNModal, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronDown, Headphones, HeadphoneOff, Maximize2, Mic, MicOff, MonitorOff, MonitorUp, PhoneOff, Video, VideoOff, X } from 'lucide-react-native'
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
  /** Inicia o detiene compartir pantalla (#53); sin esta función no hay botón. */
  onToggleScreenShare?: () => void
}

/**
 * La llamada privada encima de toda la app: la entrante (quién llama, atender y rechazar) y la pantalla de
 * la llamada (llamando…, conectando, la duración, quién habla, micrófono, audio y cortar). Las dos van en el
 * mismo modal a pantalla completa, así atender no cierra uno para abrir otro. También pide confirmar una
 * llamada hecha desde un canal de voz de servidor.
 */
type ScreenShareSide = 'remote' | 'local'

export function CallLayer({ session, voice, voiceChannelName, onToggleCamera, onToggleScreenShare }: CallLayerProps) {
  const styles = useStyles()
  const { state, viewOpen, pendingCall } = session
  const incoming = state.status === 'incoming'
  const showCall = viewOpen && (state.status === 'outgoing' || state.status === 'active' || state.status === 'ended')
  const visible = incoming || showCall
  const channel = voiceChannelName ? `•${voiceChannelName}` : 'el canal de voz'
  const [expandedScreenSide, setExpandedScreenSide] = useState<ScreenShareSide | null>(null)

  const ended = state.status === 'ended'
  const remote = voice.participants.find(p => !p.isLocal)
  const local = voice.participants.find(p => p.isLocal)
  const remoteScreen = showCall && !ended ? (remote?.screenShareTrack ?? null) : null
  const localScreen = showCall && !ended ? (local?.screenShareTrack ?? null) : null
  const activeExpandedSide: ScreenShareSide | null =
    expandedScreenSide === 'remote' && remoteScreen
      ? 'remote'
      : expandedScreenSide === 'local' && localScreen
        ? 'local'
        : null

  return (
    <>
      <RNModal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        // Atrás de Android: si hay pantalla compartida ampliada vuelve a la llamada; la entrante sigue sonando
        onRequestClose={
          incoming
            ? () => undefined
            : activeExpandedSide
              ? () => setExpandedScreenSide(null)
              : session.minimize
        }
      >
        <View style={[styles.screen, activeExpandedSide && styles.fullscreen]}>
          {!activeExpandedSide && <Background />}
          <SafeAreaView style={styles.screen}>
            {incoming ? (
              <IncomingCall session={session} channel={voice.channelId ? channel : null} />
            ) : showCall ? (
              <CallView
                session={session}
                voice={voice}
                expandedScreenSide={activeExpandedSide}
                onExpandScreen={setExpandedScreenSide}
                onToggleCamera={onToggleCamera}
                onToggleScreenShare={onToggleScreenShare}
              />
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
function CallView({
  session,
  voice,
  expandedScreenSide,
  onExpandScreen,
  onToggleCamera,
  onToggleScreenShare,
}: {
  session: PrivateCallSession
  voice: VoiceRoom
  expandedScreenSide: ScreenShareSide | null
  onExpandScreen: (side: ScreenShareSide | null) => void
  onToggleCamera?: () => void
  onToggleScreenShare?: () => void
}) {
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
  const ScreenIcon = voice.isScreenShareOn ? MonitorOff : MonitorUp
  const remoteVideo = !ended ? (remote?.videoTrack ?? null) : null
  const localVideo = !ended ? (local?.videoTrack ?? null) : null
  const remoteScreen = !ended ? (remote?.screenShareTrack ?? null) : null
  const localScreen = !ended ? (local?.screenShareTrack ?? null) : null
  const screenShares = [
    ...(remoteScreen ? [{ side: 'remote' as const, track: remoteScreen, label: `${peer.name} · pantalla` }] : []),
    ...(localScreen ? [{ side: 'local' as const, track: localScreen, label: 'Tu pantalla' }] : []),
  ]
  const expandedScreen = expandedScreenSide ? screenShares.find(s => s.side === expandedScreenSide) ?? null : null
  const hasScreenShare = screenShares.length > 0
  // Cámara y pantalla se publican en la sala: con la conexión establecida y si el token lo deja
  const cameraUsable = voice.connectionState === 'connected' && voice.canVideo
  const screenShareUsable = voice.connectionState === 'connected' && voice.canScreenShare

  if (expandedScreen) {
    return (
      <View style={styles.fullscreen}>
        <View style={styles.fullscreenHeader}>
          <View style={styles.fullscreenTitle}>
            <MonitorUp color={colors.inverseText} size={16} strokeWidth={1.5} />
            <Text variant="bodySmall" tone="inverse" bold numberOfLines={1}>
              {expandedScreen.label}
            </Text>
          </View>
          <Pressable
            onPress={() => onExpandScreen(null)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cerrar pantalla ampliada"
          >
            <X color={colors.inverseText} size={22} strokeWidth={1.5} />
          </Pressable>
        </View>
        <ParticipantVideo track={expandedScreen.track} objectFit="contain" style={styles.fullscreenVideo} />
      </View>
    )
  }

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

      <ScrollView contentContainerStyle={styles.callCenter} showsVerticalScrollIndicator={false}>
        {hasScreenShare ? (
          <>
            {screenShares.map(share => (
              <Pressable
                key={share.side}
                style={styles.screenShare}
                onPress={() => onExpandScreen(share.side)}
                accessibilityRole="button"
                accessibilityLabel={`Ampliar ${share.label}`}
              >
                <ParticipantVideo track={share.track} objectFit="contain" style={styles.fill} />
                <View style={styles.expandBadge}>
                  <Maximize2 color={colors.inverseText} size={14} strokeWidth={1.5} />
                </View>
                <View style={styles.screenLabel}>
                  <MonitorUp color={colors.inverseText} size={12} strokeWidth={1.5} />
                  <Text variant="meta" tone="inverse" bold numberOfLines={1}>
                    {share.label}
                  </Text>
                </View>
              </Pressable>
            ))}
            {(remoteVideo || localVideo) && (
              <View style={styles.cameraRow}>
                {remoteVideo && (
                  <View style={styles.cameraThumb} accessibilityLabel={`${peer.name}, con cámara`}>
                    <ParticipantVideo track={remoteVideo} style={styles.fill} />
                    {remote?.isSpeaking && <SpeakingBorder />}
                  </View>
                )}
                {localVideo && (
                  <View style={styles.cameraThumb} accessibilityLabel="Tu cámara">
                    <ParticipantVideo track={localVideo} mirrored style={styles.fill} />
                  </View>
                )}
              </View>
            )}
          </>
        ) : remoteVideo ? (
          <View style={styles.remoteVideo} accessibilityLabel={`${peer.name}, con cámara${remote?.isSpeaking ? ', hablando' : ''}`}>
            <ParticipantVideo track={remoteVideo} style={styles.fill} />
            {remote?.isSpeaking && <SpeakingBorder />}
            {localVideo && (
              <View style={styles.localPip} accessibilityLabel="Tu cámara">
                <ParticipantVideo track={localVideo} mirrored style={styles.fill} />
              </View>
            )}
          </View>
        ) : (
          <>
            <PeerAvatar peer={peer} speaking={!!remote?.isSpeaking} />
            {localVideo && (
              <View style={styles.cameraRow}>
                <View style={styles.cameraThumb} accessibilityLabel="Tu cámara">
                  <ParticipantVideo track={localVideo} mirrored style={styles.fill} />
                </View>
              </View>
            )}
          </>
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
      </ScrollView>

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
          {onToggleScreenShare && (
            <Pressable
              style={[styles.control, voice.isScreenShareOn && styles.active, !screenShareUsable && styles.disabled]}
              onPress={onToggleScreenShare}
              disabled={!screenShareUsable}
              accessibilityRole="button"
              accessibilityLabel={voice.isScreenShareOn ? 'Dejar de compartir pantalla' : 'Compartir pantalla'}
              accessibilityState={{ selected: voice.isScreenShareOn, disabled: !screenShareUsable }}
            >
              <ScreenIcon color={voice.isScreenShareOn ? colors.inverseText : colors.text} size={22} strokeWidth={1.5} />
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
  onToggleScreenShare,
}: {
  session: PrivateCallSession
  voice: VoiceRoom
  onToggleCamera?: () => void
  onToggleScreenShare?: () => void
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
      isScreenShareOn={voice.isScreenShareOn}
      onToggleScreenShare={voice.canScreenShare ? onToggleScreenShare : undefined}
    />
  )
}

const useStyles = makeStyles(t => ({
  screen: { flex: 1 },
  top: { height: t.space[7], justifyContent: 'center', paddingHorizontal: t.space[4] },
  minimize: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], alignSelf: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.space[2], paddingHorizontal: t.space[5] },
  callCenter: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space[2],
    paddingHorizontal: t.space[5],
    paddingVertical: t.space[2],
  },
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
  // Video del otro: ocupa el ancho, 3:4 como la cámara de un teléfono; la propia, adentro arriba a la derecha
  remoteVideo: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    backgroundColor: t.colors.inverseBackground,
    marginBottom: t.space[2],
  },
  localPip: {
    position: 'absolute',
    top: t.space[2],
    right: t.space[2],
    width: 84,
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    backgroundColor: t.colors.inverseBackground,
    borderWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
  },
  screenShare: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 16 / 9,
    overflow: 'hidden',
    backgroundColor: t.colors.inverseBackground,
    borderWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
    marginBottom: t.space[2],
  },
  expandBadge: {
    position: 'absolute',
    top: t.space[2],
    right: t.space[2],
    padding: t.space[1],
    backgroundColor: t.colors.inverseBackground,
  },
  screenLabel: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[1],
    paddingVertical: 2,
    paddingHorizontal: t.space[2],
    backgroundColor: t.colors.inverseBackground,
  },
  cameraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space[3],
    marginBottom: t.space[2],
  },
  cameraThumb: {
    width: 84,
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    backgroundColor: t.colors.inverseBackground,
    borderWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
  },
  fullscreen: { flex: 1, backgroundColor: t.colors.inverseBackground },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.space[3],
    paddingHorizontal: t.space[4],
    paddingVertical: t.space[3],
  },
  fullscreenTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  fullscreenVideo: { flex: 1 },
  fill: { flex: 1 },
}))
