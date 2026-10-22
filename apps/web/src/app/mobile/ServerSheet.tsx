
import {
  Bell,
  UserPlus,
  Zap,
  LogOut,
  Trash2,
} from 'lucide-react';
import { BottomSheet } from './shared';
import type { MobileShellState } from './useMobileShellState';

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Info del servidor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src={activeServer.iconUrl || activeServer.icon}
            alt={activeServer.name}
            style={{ width: 50, height: 50, borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--header-primary)' }}>
              {activeServer.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setActiveSheet('none');
              onOpenModal?.('invite');
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '12px 6px',
              backgroundColor: 'var(--bg-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'var(--interactive-normal)',
              cursor: 'pointer',
            }}
          >
            <UserPlus size={20} color="var(--brand)" />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Invitar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSheet('none');
              onConfirmAction?.('ban-member', 'Servidor Mejorado');
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '12px 6px',
              backgroundColor: 'var(--bg-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'var(--interactive-normal)',
              cursor: 'pointer',
            }}
          >
            <Zap size={20} color="#f47fff" />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Mejorar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSheet('none');
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '12px 6px',
              backgroundColor: 'var(--bg-primary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'var(--interactive-normal)',
              cursor: 'pointer',
            }}
          >
            <Bell size={20} color="var(--status-idle)" />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Notificaciones</span>
          </button>
        </div>

        {/* Toggles de configuración */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, backgroundColor: 'var(--bg-primary)', padding: 12, borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--header-primary)' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--header-primary)' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setActiveSheet('none');
              onConfirmAction?.('leave-server', activeServer.name);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              color: 'var(--danger)',
              background: 'none',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                color: 'var(--danger)',
                background: 'none',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Trash2 size={18} /> Eliminar Servidor
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
