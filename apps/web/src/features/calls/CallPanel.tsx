import { useEffect, useState } from 'react';
import { Headphones, HeadphoneOff, Maximize2, Mic, MicOff, Minimize2, Video, VideoOff, type LucideIcon } from 'lucide-react';
import type { VideoTrack } from 'livekit-client';
import { callRoomId, type PrivateCallState } from '@discordia/core';
import { BlockButton, SquareAvatar } from '../../ui';
import type { User } from '../../types';
import { useCurrentUser } from '../profile/currentUserStore';
import { useVoice } from '../voice/voiceContext';
import { CONNECTION_LABEL, isPending } from '../voice/connectionState';
import { ParticipantVideo } from '../voice/ParticipantVideo';
import { useCall } from './callContext';
import { formatCallDuration } from './callDuration';
import styles from './CallPanel.module.css';

type InCallState = Extract<PrivateCallState, { status: 'outgoing' | 'active' }>;

/** "en llamada/ 02:31": desde `answeredAt`, o desde que este dispositivo la vio activa (al montarse). */
function ActiveStatus({ answeredAt }: { answeredAt?: string }) {
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(mountedAt);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const answered = Date.parse(answeredAt ?? '');
  const since = Number.isNaN(answered) ? mountedAt : Math.min(answered, now);
  // La duración no se anuncia: el estado es una región viva y cambiaría cada segundo
  return (
    <>
      en llamada/ <span aria-hidden="true">{formatCallDuration(now - since)}</span>
    </>
  );
}

/**
 * La llamada en el chat del DM (#50): en qué está (llamando…, conectando, en llamada con la duración), las
 * dos fichas con quién habla, y micrófono, audio, cámara (#54) y cortar. Solo en la conversación de la llamada.
 * Con alguna cámara prendida las fichas crecen y muestran el video (la de quien no tiene cámara, su avatar).
 * Tocar las fichas (o el botón de pantalla completa) la lleva a ocupar toda la ventana; Escape la vuelve al chat.
 */
export function CallPanel({ conversationId, peer }: { conversationId: string; peer: User }) {
  const { state } = useCall();
  const me = useCurrentUser();
  if ((state.status !== 'outgoing' && state.status !== 'active') || state.conversationId !== conversationId) return null;
  return <CallPanelView state={state} peer={peer} me={me} />;
}

function CallPanelView({ state, peer, me }: { state: InCallState; peer: User; me: User }) {
  const { hangUp } = useCall();
  const { room, toggleCamera } = useVoice();
  const [expanded, setExpanded] = useState(false);

  // Escape sale de la pantalla completa (un modal abierto encima, como "¿cortar?", lo cierra primero)
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Los datos de LiveKit (quién habla, mute del otro) solo si la sala es la de esta llamada
  const inRoom = state.call !== null && room.roomId === callRoomId(state.call.id);
  const local = inRoom ? room.participants.find((p) => p.isLocal) : undefined;
  const remote = inRoom ? room.participants.find((p) => !p.isLocal) : undefined;
  const localVideo = local?.videoTrack ?? null;
  const remoteVideo = remote?.videoTrack ?? null;
  const withVideo = Boolean(localVideo || remoteVideo);
  // En pantalla completa las fichas siempre son cuadros grandes, con o sin video
  const framed = withVideo || expanded;
  // La cámara se publica en la sala: con la conexión establecida y si el token la deja (Voice viejo: no)
  const cameraUsable = inRoom && room.connectionState === 'connected' && room.canVideo;

  const peerName = peer.displayName || peer.username;
  const connecting = state.status === 'active' && inRoom && isPending(room.connectionState);
  const status =
    state.status === 'outgoing'
      ? 'llamando…/'
      : connecting
        ? CONNECTION_LABEL[room.connectionState]
        : null;

  return (
    <section
      className={`${styles.panel} ${framed ? styles.withVideo : ''} ${expanded ? styles.expanded : ''}`}
      aria-label={`Llamada con ${peerName}`}
    >
      <p className={`${styles.status} ${state.status === 'outgoing' || connecting ? styles.pending : ''}`} role="status">
        {status ?? <ActiveStatus key={state.call?.id} answeredAt={state.call?.answeredAt} />}
      </p>

      {/* Con el mouse, tocar las fichas agranda la llamada; con el teclado, el botón de pantalla completa */}
      <ul
        className={`${styles.tiles} ${expanded ? '' : styles.expandable}`}
        aria-label="Participantes de la llamada"
        onClick={expanded ? undefined : () => setExpanded(true)}
      >
        <Tile
          user={me}
          label={`${me.displayName || me.username} (vos)`}
          speaking={Boolean(local?.isSpeaking)}
          muted={room.isMuted}
          framed={framed}
          video={localVideo}
          mirrored
        />
        <Tile
          user={peer}
          label={peerName}
          speaking={Boolean(remote?.isSpeaking)}
          muted={Boolean(remote?.isMuted)}
          waiting={state.status === 'outgoing'}
          framed={framed}
          video={remoteVideo}
        />
      </ul>

      <div className={styles.controls}>
        <Control
          icon={room.isMuted ? MicOff : Mic}
          label={room.isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
          pressed={room.isMuted}
          onPress={room.toggleMute}
        />
        <Control
          icon={room.isDeafened ? HeadphoneOff : Headphones}
          label={room.isDeafened ? 'Activar audio' : 'Ensordecer audio'}
          pressed={room.isDeafened}
          onPress={room.toggleDeafen}
        />
        <Control
          icon={room.isCameraOn ? Video : VideoOff}
          label={room.isCameraOn ? 'Apagar cámara' : 'Prender cámara'}
          pressed={room.isCameraOn}
          inverted={false}
          disabled={!cameraUsable}
          onPress={toggleCamera}
        />
        <Control
          icon={expanded ? Minimize2 : Maximize2}
          label={expanded ? 'Salir de pantalla completa' : 'Pantalla completa'}
          pressed={expanded}
          inverted={false}
          onPress={() => setExpanded((current) => !current)}
        />
        <BlockButton tone="danger" onPress={hangUp} aria-label={state.status === 'outgoing' ? 'Cancelar llamada' : 'Cortar llamada'}>
          Cortar
        </BlockButton>
      </div>
    </section>
  );
}

interface TileProps {
  user: User;
  label: string;
  speaking: boolean;
  muted: boolean;
  waiting?: boolean;
  /** Hay video en la llamada: la ficha es un cuadro grande, con el video o el avatar en el medio. */
  framed?: boolean;
  video?: VideoTrack | null;
  /** La cámara propia, en espejo. */
  mirrored?: boolean;
}

function Tile({ user, label, speaking, muted, waiting = false, framed = false, video = null, mirrored = false }: TileProps) {
  const detail = [waiting ? ', sonando' : speaking ? ', hablando' : muted ? ', silenciado' : '', video ? ', con cámara' : ''].join('');
  return (
    <li
      className={`${styles.tile} ${speaking ? styles.speaking : ''} ${waiting ? styles.waiting : ''}`}
      aria-label={`${label}${detail}`}
    >
      {framed ? (
        <span className={styles.frame}>
          {video ? <ParticipantVideo track={video} mirrored={mirrored} /> : <SquareAvatar user={user} size={56} />}
        </span>
      ) : (
        <SquareAvatar user={user} size={56} />
      )}
      <span className={styles.tileName} aria-hidden="true">
        {label}
        {muted && !waiting && <MicOff size={12} strokeWidth={1.5} className={styles.mutedIcon} />}
      </span>
    </li>
  );
}

interface ControlProps {
  icon: LucideIcon;
  label: string;
  pressed: boolean;
  /** Ícono invertido (algo apagado: micrófono, audio). Por defecto, cuando está presionado. */
  inverted?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function Control({ icon: Icon, label, pressed, inverted = pressed, disabled = false, onPress }: ControlProps) {
  return (
    <button
      type="button"
      className={`${styles.control} ${inverted ? styles.controlOff : ''} ${pressed && !inverted ? styles.controlOn : ''}`}
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
    >
      <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
