
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
import styles from './MobileVoiceScreen.module.css';

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
    <div className={styles.root}>
      {/* Header de Voz */}
      <div className={styles.headerVoz}>
        <div className={styles.headerVozDiv}>
          <button
            type="button"
            onClick={() => setScreen('channels')}
            className="btn-icon"
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className={styles.headerVozDivDiv}>
              {activeChannel?.name || 'Sala de Voz'}
            </div>
            <div className={styles.headerVozDivDiv2}>
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
      <div className={styles.cuadriculaParticipantes}>
        {/* Usuario actual */}
        <div
          className={styles.usuarioActual} style={{ borderRadius: 'var(--radius-md)', border: isMuted ? '1px solid rgba(255, 255, 255, 0.08)' : '2px solid var(--status-online)' }}
        >
          <img
            src={currentUser.avatarUrl || currentUser.avatar}
            alt={currentUser.displayName}
            className={styles.usuarioActualImg}
          />
          <span className={styles.usuarioActualSpan}>
            {currentUser.displayName} (Tú)
          </span>
          <div
            className={styles.usuarioActualDiv} style={{ backgroundColor: isMuted ? 'var(--danger)' : 'rgba(0,0,0,0.5)' }}
          >
            {isMuted ? <MicOff size={12} /> : <Mic size={12} />}
          </div>
        </div>

        {/* Participante de prueba */}
        <div className={styles.participantePrueba}>
          <img
            src={""}
            alt="Perfil"
            className={styles.usuarioActualImg}
          />
          <span className={styles.usuarioActualSpan}>
            Perfil
          </span>
          <div className={styles.participantePruebaDiv}>
            <Mic size={12} />
          </div>
        </div>
      </div>

      {/* Controles de Voz Flotantes */}
      <div className={styles.controlesVozFlotantes}>
        {/* Micrófono */}
        <button
          type="button"
          onClick={() => setIsMuted((m) => !m)}
          className={styles.microfono} style={{ backgroundColor: isMuted ? 'var(--danger)' : 'var(--bg-primary)' }}
          title={isMuted ? 'Reactivar micrófono' : 'Silenciar micrófono'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Ensordecer */}
        <button
          type="button"
          onClick={() => setIsDeafened((d) => !d)}
          className={styles.microfono} style={{ backgroundColor: isDeafened ? 'var(--danger)' : 'var(--bg-primary)' }}
          title={isDeafened ? 'Reactivar audio' : 'Ensordecer'}
        >
          <Headphones size={20} />
        </button>

        {/* Vídeo / Pantalla */}
        <button
          type="button"
          className={styles.videoPantalla}
          title="Compartir cámara"
        >
          <Video size={20} />
        </button>

        {/* Desconectar */}
        <button
          type="button"
          onClick={() => setScreen('channels')}
          className={styles.desconectar}
          title="Desconectar llamada"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}
