import { PhoneOff } from 'lucide-react';
import { useUsers } from '../../app/usersContext';
import { openDirectChat } from '../friends/openDirectChat';
import styles from '../voice/VoiceControls.module.css';
import { isInCall, useCall } from './callContext';

/**
 * La llamada privada en la barra lateral, arriba de la barra de usuario (en el lugar de los controles de
 * un canal de voz): con quién, en qué está, volver al chat y cortar desde cualquier vista.
 */
export function CallControlsPanel({ tone = 'muted' }: { tone?: 'ink' | 'sky' | 'muted' }) {
  const { state, peerId, hangUp } = useCall();
  const { userOrFallback } = useUsers();
  if (!isInCall(state)) return null;

  const peer = peerId ? userOrFallback(peerId) : null;
  const peerName = peer?.displayName || peer?.username || 'llamada';
  const label = state.status === 'outgoing' ? 'llamando…/' : 'en llamada/';

  return (
    <div className={`${styles.controls} ${styles[tone]}`} role="group" aria-label="Llamada privada en curso">
      <button
        type="button"
        className={styles.where}
        onClick={peerId ? () => openDirectChat(peerId) : undefined}
        disabled={!peerId}
        title="Volver al chat de la llamada"
      >
        <span className={styles.channel}>@{peerName}</span>
        <span className={`${styles.meta} ${state.status === 'outgoing' ? styles.pending : ''}`}> {label}</span>
      </button>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.control}
          onClick={hangUp}
          aria-label={state.status === 'outgoing' ? 'Cancelar llamada' : 'Cortar llamada'}
          title={state.status === 'outgoing' ? 'Cancelar llamada' : 'Cortar llamada'}
        >
          <PhoneOff size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
