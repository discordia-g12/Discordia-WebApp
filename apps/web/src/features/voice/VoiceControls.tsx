import { MonitorUp, PhoneOff, VideoOff, type LucideIcon } from 'lucide-react';
import { useUIStore } from '../../app/uiStore';
import { useVoice } from './VoiceProvider';
import { useVoiceParticipants } from './useVoiceParticipants';
import { CONNECTION_LABEL, isPending, type VoiceViewConnectionState } from './VoiceView';
import styles from './VoiceControls.module.css';

export interface VoiceControlsProps {
  channelName: string;
  serverName?: string;
  connectionState: VoiceViewConnectionState;
  /** El tono de la barra de usuario que tiene debajo (ink, sky o muted). */
  tone?: 'ink' | 'sky' | 'muted';
  /** Vuelve a la vista de la llamada (desde otro canal o el inicio). */
  onOpenCall?: () => void;
  onDisconnect: () => void;
}

/**
 * Controles de la llamada en la barra lateral, entre la marca de agua y la barra de usuario (PDF,
 * pág. 10): en qué canal estás, el estado de la conexión, y cámara, pantalla y colgar. Micrófono y audio
 * están en la barra de usuario. Cámara y pantalla todavía no existen (por ahora la voz es solo audio).
 */
export function VoiceControls({ channelName, serverName, connectionState, tone = 'muted', onOpenCall, onDisconnect }: VoiceControlsProps) {
  return (
    <div className={`${styles.controls} ${styles[tone]}`} role="group" aria-label="Llamada en curso">
      <button type="button" className={styles.where} onClick={onOpenCall} disabled={!onOpenCall}>
        <span className={styles.channel}>•{channelName}</span>
        {serverName && <span className={styles.meta}> / {serverName}</span>}
        <span className={`${styles.meta} ${isPending(connectionState) ? styles.pending : ''}`}> {CONNECTION_LABEL[connectionState]}</span>
      </button>
      <div className={styles.buttons}>
        <Control icon={VideoOff} label="Cámara: próximamente" disabled />
        <Control icon={MonitorUp} label="Compartir pantalla: próximamente" disabled />
        <Control icon={PhoneOff} label="Salir del canal de voz" onPress={onDisconnect} />
      </div>
    </div>
  );
}

function Control({ icon: Icon, label, disabled, onPress }: { icon: LucideIcon; label: string; disabled?: boolean; onPress?: () => void }) {
  return (
    <button type="button" className={styles.control} onClick={onPress} disabled={disabled} aria-label={label} title={label}>
      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}

/** Controles conectados a la sala de voz; no se muestran fuera de una llamada. */
export function VoiceControlsPanel({ tone }: { tone: VoiceControlsProps['tone'] }) {
  const voice = useVoice();
  const { activeVoice } = useVoiceParticipants();
  if (!voice.room.channelId) return null;

  return (
    <VoiceControls
      channelName={activeVoice?.ch.name ?? 'Voz'}
      serverName={activeVoice?.srv.name}
      connectionState={voice.room.connectionState}
      tone={tone}
      onDisconnect={voice.disconnect}
      onOpenCall={
        activeVoice
          ? () => {
              const ui = useUIStore.getState();
              ui.setSelectedServerId(activeVoice.srv.id);
              ui.setSelectedChannelId(activeVoice.ch.id);
              ui.setAppView('voice');
            }
          : undefined
      }
    />
  );
}
