import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { durations } from '@discordia/tokens';
import { callEndMessage } from '@discordia/core';
import { ActionLink, BlockButton, SquareAvatar, useMotionPreset } from '../../ui';
import { useUsers } from '../../app/usersContext';
import { useVoice } from '../voice/voiceContext';
import { useCall } from './callContext';
import { useRingtone, useTabTitle } from './useCallAlerts';
import styles from './CallNotices.module.css';

/** Cuánto queda el aviso de cómo terminó, si no se cierra antes. */
export const CALL_END_NOTICE_MS = durations.toast * 2;

/**
 * Avisos de la llamada privada, en cualquier vista (escritorio y mobile web): la entrante, con quién llama,
 * atender y rechazar, y cómo terminó. Mientras suena hay timbre (si el navegador deja reproducir audio) y el
 * título de la pestaña lo dice.
 */
export function CallNotices() {
  const { state, peerId, accept, decline, dismiss } = useCall();
  const { userOrFallback } = useUsers();
  const { room } = useVoice();
  const peer = peerId ? userOrFallback(peerId) : null;
  const peerName = peer?.displayName || peer?.username || 'alguien';

  const ringing = state.status === 'incoming' && !state.accepting;
  useRingtone(ringing ? 'incoming' : state.status === 'outgoing' ? 'outgoing' : null);
  useTabTitle(ringing ? `llamada entrante/ ${peerName}` : null);

  // El aviso de cómo terminó se va solo
  const endedId = state.status === 'ended' ? state.call.id : null;
  useEffect(() => {
    if (!endedId) return;
    const timer = setTimeout(dismiss, CALL_END_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [endedId, dismiss]);

  return (
    <div className={styles.host}>
      <AnimatePresence>
        {state.status === 'incoming' && (
          <IncomingCall
            key={state.call.id}
            peer={peer ?? { displayName: peerName, username: peerName }}
            peerName={peerName}
            accepting={state.accepting}
            leavesChannel={room.channelId !== null}
            onAccept={accept}
            onDecline={decline}
          />
        )}
        {state.status === 'ended' && (
          <EndedCall key={state.call.id} peerName={peerName} message={callEndMessage(state.reason, state.role)} onDismiss={dismiss} />
        )}
      </AnimatePresence>
    </div>
  );
}

function IncomingCall({
  peer,
  peerName,
  accepting,
  leavesChannel,
  onAccept,
  onDecline,
}: {
  peer: Parameters<typeof SquareAvatar>[0]['user'];
  peerName: string;
  accepting: boolean;
  /** Está en un canal de voz de servidor: atender lo saca. */
  leavesChannel: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const enter = useMotionPreset('rise');
  const ref = useRef<HTMLElement>(null);

  // Si no estaba escribiendo ni usando otro control, el foco va a atender: se contesta con Enter
  useEffect(() => {
    const active = document.activeElement;
    if (!active || active === document.body) ref.current?.querySelector<HTMLButtonElement>('[data-call-accept]')?.focus();
  }, []);

  return (
    <motion.section ref={ref} className={styles.incoming} aria-label={`Llamada entrante de ${peerName}`} aria-describedby="incoming-call-detail" {...enter}>
      <SquareAvatar user={peer} size={40} />
      <div className={styles.text}>
        <p className={styles.name}>
          {peerName}
        </p>
        <p id="incoming-call-detail" className={styles.meta} role="status">
          {accepting ? 'conectando/' : 'te está llamando/'}
          {leavesChannel && !accepting && <span className={styles.hint}> atender te saca del canal de voz</span>}
        </p>
      </div>
      <div className={styles.actions}>
        <ActionLink onPress={onDecline} disabled={accepting}>
          rechazar
        </ActionLink>
        <BlockButton data-call-accept onPress={onAccept} loading={accepting}>
          Atender
        </BlockButton>
      </div>
    </motion.section>
  );
}

function EndedCall({ peerName, message, onDismiss }: { peerName: string; message: string; onDismiss: () => void }) {
  const enter = useMotionPreset('rise');
  return (
    <motion.div className={styles.ended} role="status" {...enter}>
      <span>
        <span className={styles.endedName}>{peerName}</span> / {message}/
      </span>
      <ActionLink onPress={onDismiss} className={styles.endedAction}>
        cerrar
      </ActionLink>
    </motion.div>
  );
}
