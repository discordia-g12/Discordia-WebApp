import React, {    } from 'react';
import {
  Phone, PhoneOff, Radio 
} from 'lucide-react';
import { User } from '../../../types';
import styles from './LegacyIncomingCallModal.module.css';

export interface IncomingCallModalProps {
  caller?: User;
  channelName?: string;
  isOpen?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Diálogo flotante inferior derecho animado para llamadas de voz/vídeo entrantes.
 */
export const LegacyIncomingCallModal: React.FC<IncomingCallModalProps> = ({
  caller = ({} as Record<string, User>)['u1'],
  channelName = 'Llamada Directa',
  isOpen = true,
  onAccept,
  onDecline,
}) => {
  if (!isOpen || !caller) return null;

  return (
    <div
      className={styles.root}
      role="alertdialog"
      aria-labelledby="incoming-call-title"
    >
      <div className={styles.rootDiv}>
        {/* Avatar del llamante con pulso animado */}
        <div className={styles.avatarLlamantePulsoAnimado}>
          <div className={styles.avatarLlamantePulsoAnimadoDiv} />
          <img
            src={caller.avatarUrl || caller.avatar}
            alt={caller.displayName}
            className={styles.avatarLlamantePulsoAnimadoImg}
          />
          <div className={styles.avatarLlamantePulsoAnimadoDiv2}>
            <Radio size={12} />
          </div>
        </div>

        {/* Nombre y subtítulo */}
        <h4 id="incoming-call-title" className={styles.nombreSubtitulo}>
          {caller.displayName}
        </h4>
        <span className={styles.rootDivSpan}>
          te está llamando... ({channelName})
        </span>

        {/* Botones redondos de respuesta */}
        <div className={styles.botonesRedondosRespuesta}>
          {/* Rechazar */}
          <div className={styles.rechazar}>
            <button
              type="button"
              onClick={onDecline}
              aria-label="Rechazar llamada"
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--danger)',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(218, 55, 60, 0.4)',
                transition: 'transform 0.15s, background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <PhoneOff size={24} />
            </button>
            <span className={styles.rechazar2}>Rechazar</span>
          </div>

          {/* Aceptar */}
          <div className={styles.rechazar}>
            <button
              type="button"
              onClick={onAccept}
              aria-label="Aceptar llamada"
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--status-online)',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(35, 165, 90, 0.4)',
                transition: 'transform 0.15s, background-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Phone size={24} />
            </button>
            <span className={styles.rechazar2}>Aceptar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
