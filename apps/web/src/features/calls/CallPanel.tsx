import { useEffect, useState } from 'react';
import { Headphones, HeadphoneOff, Mic, MicOff, type LucideIcon } from 'lucide-react';
import { callRoomId, type PrivateCallState } from '@discordia/core';
import { BlockButton, SquareAvatar } from '../../ui';
import type { User } from '../../types';
import { useCurrentUser } from '../profile/currentUserStore';
import { useVoice } from '../voice/voiceContext';
import { CONNECTION_LABEL, isPending } from '../voice/connectionState';
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
 * dos fichas con quién habla, y micrófono, audio y cortar. Solo en la conversación de la llamada.
 */
export function CallPanel({ conversationId, peer }: { conversationId: string; peer: User }) {
  const { state } = useCall();
  const me = useCurrentUser();
  if ((state.status !== 'outgoing' && state.status !== 'active') || state.conversationId !== conversationId) return null;
  return <CallPanelView state={state} peer={peer} me={me} />;
}

function CallPanelView({ state, peer, me }: { state: InCallState; peer: User; me: User }) {
  const { hangUp } = useCall();
  const { room } = useVoice();

  // Los datos de LiveKit (quién habla, mute del otro) solo si la sala es la de esta llamada
  const inRoom = state.call !== null && room.roomId === callRoomId(state.call.id);
  const local = inRoom ? room.participants.find((p) => p.isLocal) : undefined;
  const remote = inRoom ? room.participants.find((p) => !p.isLocal) : undefined;

  const peerName = peer.displayName || peer.username;
  const connecting = state.status === 'active' && inRoom && isPending(room.connectionState);
  const status =
    state.status === 'outgoing'
      ? 'llamando…/'
      : connecting
        ? CONNECTION_LABEL[room.connectionState]
        : null;

  return (
    <section className={styles.panel} aria-label={`Llamada con ${peerName}`}>
      <p className={`${styles.status} ${state.status === 'outgoing' || connecting ? styles.pending : ''}`} role="status">
        {status ?? <ActiveStatus key={state.call?.id} answeredAt={state.call?.answeredAt} />}
      </p>

      <ul className={styles.tiles} aria-label="Participantes de la llamada">
        <Tile user={me} label={`${me.displayName || me.username} (vos)`} speaking={Boolean(local?.isSpeaking)} muted={room.isMuted} />
        <Tile
          user={peer}
          label={peerName}
          speaking={Boolean(remote?.isSpeaking)}
          muted={Boolean(remote?.isMuted)}
          waiting={state.status === 'outgoing'}
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
        <BlockButton tone="danger" onPress={hangUp} aria-label={state.status === 'outgoing' ? 'Cancelar llamada' : 'Cortar llamada'}>
          Cortar
        </BlockButton>
      </div>
    </section>
  );
}

function Tile({ user, label, speaking, muted, waiting = false }: { user: User; label: string; speaking: boolean; muted: boolean; waiting?: boolean }) {
  const detail = waiting ? ', sonando' : speaking ? ', hablando' : muted ? ', silenciado' : '';
  return (
    <li
      className={`${styles.tile} ${speaking ? styles.speaking : ''} ${waiting ? styles.waiting : ''}`}
      aria-label={`${label}${detail}`}
    >
      <SquareAvatar user={user} size={56} />
      <span className={styles.tileName} aria-hidden="true">
        {label}
        {muted && !waiting && <MicOff size={12} strokeWidth={1.5} className={styles.mutedIcon} />}
      </span>
    </li>
  );
}

function Control({ icon: Icon, label, pressed, onPress }: { icon: LucideIcon; label: string; pressed: boolean; onPress: () => void }) {
  return (
    <button
      type="button"
      className={`${styles.control} ${pressed ? styles.controlOff : ''}`}
      onClick={onPress}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
    >
      <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
