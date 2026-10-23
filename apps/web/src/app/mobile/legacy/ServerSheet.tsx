
import {
  Bell,
  UserPlus,
  Zap,
  LogOut,
  Trash2,
} from 'lucide-react';
import { BottomSheet } from './shared';
import type { MobileShellState } from './useMobileShellState';
import styles from './ServerSheet.module.css';

/** Sección "1. SERVER SHEET" de MobileShell. */
export function ServerSheet({ s }: { s: MobileShellState }) {
  const {
    currentUser,
    onOpenModal,
    onConfirmAction,
    activeSheet,
    setActiveSheet,
    hideMutedChannels,
    setHideMutedChannels,
    allowMemberDMs,
    setAllowMemberDMs,
    activeServer,
  } = s;
  return (
    <BottomSheet
      isOpen={activeSheet === 'server'}
      onClose={() => setActiveSheet('none')}
      title={activeServer.name}
    >
      <div className={styles.div}>
        {/* Info del servidor */}
        <div className={styles.infoServidor}>
          <img
            src={activeServer.iconUrl || activeServer.icon}
            alt={activeServer.name}
            className={styles.infoServidorImg}
          />
          <div>
            <div className={styles.infoServidorDiv}>
              {activeServer.name}
            </div>
            <div className={styles.infoServidorDiv2}>
              {activeServer.members.length} miembros • 5 en línea
            </div>
            {activeServer.boostLevel > 0 && (
              <span className="badge badge-boost" style={{ marginTop: 4 }}>
                Nivel {activeServer.boostLevel} • {activeServer.boostCount} Mejoras
              </span>
            )}
          </div>
        </div>

        {/* Cuadrícula de Acciones Rápidas */}
        <div className={styles.cuadriculaAccionesRapidas}>
          <button
            type="button"
            onClick={() => {
              setActiveSheet('none');
              onOpenModal?.('invite');
            }}
            className={styles.cuadriculaAccionesRapidasButton}
          >
            <UserPlus size={20} color="var(--brand)" />
            <span className={styles.invitar}>Invitar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSheet('none');
              onConfirmAction?.('ban-member', 'Servidor Mejorado');
            }}
            className={styles.cuadriculaAccionesRapidasButton}
          >
            <Zap size={20} color="#f47fff" />
            <span className={styles.invitar}>Mejorar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSheet('none');
            }}
            className={styles.cuadriculaAccionesRapidasButton}
          >
            <Bell size={20} color="var(--status-idle)" />
            <span className={styles.invitar}>Notificaciones</span>
          </button>
        </div>

        {/* Toggles de configuración */}
        <div className={styles.togglesConfiguracion}>
          <div className={styles.togglesConfiguracionDiv}>
            <span className={styles.ocultarCanalesSilenciados}>
              Ocultar canales silenciados
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={hideMutedChannels}
                onChange={(e) => setHideMutedChannels(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>

          <div className={styles.togglesConfiguracionDiv}>
            <span className={styles.ocultarCanalesSilenciados}>
              Permitir mensajes directos de miembros
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={allowMemberDMs}
                onChange={(e) => setAllowMemberDMs(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>
        </div>

        {/* Acciones de peligro */}
        <div className={styles.accionesPeligro}>
          <button
            type="button"
            onClick={() => {
              setActiveSheet('none');
              onConfirmAction?.('leave-server', activeServer.name);
            }}
            className={styles.accionesPeligroButton}
          >
            <LogOut size={18} /> Abandonar Servidor
          </button>

          {activeServer.ownerId === currentUser.id && (
            <button
              type="button"
              onClick={() => {
                setActiveSheet('none');
                onConfirmAction?.('delete-server', activeServer.name);
              }}
              className={styles.accionesPeligroButton}
            >
              <Trash2 size={18} /> Eliminar Servidor
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
