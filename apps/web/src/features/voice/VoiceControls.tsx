import { MonitorUp, PhoneOff, Video, VideoOff, type LucideIcon } from 'lucide-react';
import { useUIStore } from '../../app/uiStore';
import { useVoice } from './voiceContext';
import { useVoiceParticipants } from './useVoiceParticipants';
import { CONNECTION_LABEL, isPending, type VoiceViewConnectionState } from './connectionState';
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
  /** Cámara propia prendida. */
  isCameraOn?: boolean;
  /** Prende o apaga la cámara; sin esta función el botón queda deshabilitado. */
  onToggleCamera?: () => void;
}

/**
 * Controles de la llamada en la barra lateral, entre la marca de agua y la barra de usuario (PDF,
 * pág. 10): en qué canal estás, el estado de la conexión, y cámara, pantalla y colgar. Micrófono y audio
 * están en la barra de usuario. Compartir pantalla todavía no existe.
 */
export function VoiceControls({
  channelName,
  serverName,
  connectionState,
  tone = 'muted',
  onOpenCall,
  onDisconnect,
  isCameraOn = false,
  onToggleCamera,
}: VoiceControlsProps) {
  // La cámara se publica en la sala: solo se puede usar con la conexión establecida
  const cameraUsable = Boolean(onToggleCamera) && connectionState === 'connected';
  return (
    <div className={`${styles.controls} ${styles[tone]}`} role="group" aria-label="Llamada en curso">
      <button type="button" className={styles.where} onClick={onOpenCall} disabled={!onOpenCall}>
        <span className={styles.channel}>•{channelName}</span>
        {serverName && <span className={styles.meta}> / {serverName}</span>}
        <span className={`${styles.meta} ${isPending(connectionState) ? styles.pending : ''}`}> {CONNECTION_LABEL[connectionState]}</span>
      </button>
      <div className={styles.buttons}>
        <Control
          icon={isCameraOn ? Video : VideoOff}
          label={isCameraOn ? 'Apagar cámara' : 'Prender cámara'}
          pressed={isCameraOn}
          disabled={!cameraUsable}
          onPress={onToggleCamera}
        />
        <Control icon={MonitorUp} label="Compartir pantalla: próximamente" disabled />
        <Control icon={PhoneOff} label="Salir del canal de voz" onPress={onDisconnect} />
      </div>
    </div>
  );
}

function Control({
  icon: Icon,
  label,
  disabled,
  pressed,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  /** Botón de dos estados (cámara): se marca cuando está activo. */
  pressed?: boolean;
  onPress?: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.control} ${pressed ? styles.active : ''}`}
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
    >
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
      isCameraOn={voice.room.isCameraOn}
      onToggleCamera={voice.toggleCamera}
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
