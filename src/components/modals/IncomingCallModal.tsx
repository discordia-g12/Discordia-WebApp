import React, {    } from 'react';
import {
  Phone, PhoneOff, Radio 
} from 'lucide-react';
import { User } from '../../types';

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
export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  caller = ({} as Record<string, User>)['u1'],
  channelName = 'Llamada Directa',
  isOpen = true,
  onAccept,
  onDecline,
}) => {
  if (!isOpen || !caller) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1200,
        width: 320,
        backgroundColor: 'var(--bg-floating)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-floating)',
        padding: '20px',
        animation: 'slideUp 0.25s ease',
        color: 'var(--text-normal)',
      }}
      role="alertdialog"
      aria-labelledby="incoming-call-title"
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        {/* Avatar del llamante con pulso animado */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: 'var(--radius-full)',
              border: '2px solid var(--status-online)',
              animation: 'pulse 1.8s infinite ease-in-out',
            }}
          />
          <img
            src={caller.avatarUrl || caller.avatar}
            alt={caller.displayName}
            style={{
              width: 68,
              height: 68,
              borderRadius: 'var(--radius-full)',
              objectFit: 'cover',
              border: '3px solid var(--bg-floating)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: 'var(--status-online)',
              borderRadius: 'var(--radius-full)',
              padding: 4,
              border: '2px solid var(--bg-floating)',
              color: 'white',
              display: 'flex',
            }}
          >
            <Radio size={12} />
          </div>
        </div>

        {/* Nombre y subtítulo */}
        <h4 id="incoming-call-title" style={{ fontSize: 17, fontWeight: 700, color: 'var(--header-primary)', margin: 0 }}>
          {caller.displayName}
        </h4>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          te está llamando... ({channelName})
        </span>

        {/* Botones redondos de respuesta */}
        <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
          {/* Rechazar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
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
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rechazar</span>
          </div>

          {/* Aceptar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
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
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aceptar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
