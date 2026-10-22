
import {
  ArrowLeft,
  Users,
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  Video,
} from 'lucide-react';
import type { MobileShellState } from './useMobileShellState';

/** Sección "VISTA 2: VOICE" de MobileShell. */
export function MobileVoiceScreen({ s }: { s: MobileShellState }) {
  const {
    currentUser,
    setScreen,
    setActiveSheet,
    isMuted,
    setIsMuted,
    isDeafened,
    setIsDeafened,
    activeChannel,
  } = s;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: '#111214',
      }}
    >
      {/* Header de Voz */}
      <div
        style={{
          height: 52,
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => setScreen('channels')}
            className="btn-icon"
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--header-primary)' }}>
              {activeChannel?.name || 'Sala de Voz'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--status-online)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="status-dot online" style={{ width: 6, height: 6 }} />
              RTC Conectado (64 kbps)
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveSheet('member')}
          className="btn-icon"
          aria-label="Ver participantes"
        >
          <Users size={19} />
        </button>
      </div>

      {/* Cuadrícula de participantes */}
      <div
        style={{
          flex: 1,
          padding: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12,
          alignContent: 'center',
        }}
      >
        {/* Usuario actual */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            border: isMuted ? '1px solid rgba(255, 255, 255, 0.08)' : '2px solid var(--status-online)',
          }}
        >
          <img
            src={currentUser.avatarUrl || currentUser.avatar}
            alt={currentUser.displayName}
            style={{ width: 60, height: 60, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
          />
          <span style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--header-primary)' }}>
            {currentUser.displayName} (Tú)
          </span>
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: isMuted ? 'var(--danger)' : 'rgba(0,0,0,0.5)',
              padding: 4,
              borderRadius: 'var(--radius-full)',
              color: 'white',
              display: 'flex',
            }}
          >
            {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
          </div>
        </div>

        {/* Participante de prueba */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <img
            src={""}
            alt="Perfil"
            style={{ width: 60, height: 60, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
          />
          <span style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--header-primary)' }}>
            Perfil
          </span>
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: 4,
              borderRadius: 'var(--radius-full)',
              color: 'white',
              display: 'flex',
            }}
          >
            <Mic size={12} />
          </div>
        </div>
      </div>

      {/* Controles de Voz Flotantes */}
      <div
        style={{
          padding: '16px 24px',
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        {/* Micrófono */}
        <button
          type="button"
          onClick={() => setIsMuted((m) => !m)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            backgroundColor: isMuted ? 'var(--danger)' : 'var(--bg-primary)',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isMuted ? 'Reactivar micrófono' : 'Silenciar micrófono'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Ensordecer */}
        <button
          type="button"
          onClick={() => setIsDeafened((d) => !d)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            backgroundColor: isDeafened ? 'var(--danger)' : 'var(--bg-primary)',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title={isDeafened ? 'Reactivar audio' : 'Ensordecer'}
        >
          <Headphones size={20} />
        </button>

        {/* Vídeo / Pantalla */}
        <button
          type="button"
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-primary)',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Compartir cámara"
        >
          <Video size={20} />
        </button>

        {/* Desconectar */}
        <button
          type="button"
          onClick={() => setScreen('channels')}
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--danger)',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Desconectar llamada"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
