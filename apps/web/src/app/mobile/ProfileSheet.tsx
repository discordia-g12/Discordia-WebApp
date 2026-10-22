
import {
  Sparkles,
} from 'lucide-react';
import { BottomSheet } from './shared';
import type { MobileShellState } from './useMobileShellState';

/** Sección "2. PROFILE SHEET" de MobileShell. */
export function ProfileSheet({ s }: { s: MobileShellState }) {
  const { currentUser, onOpenModal, activeSheet, setActiveSheet } = s;
  return (
    <BottomSheet
      isOpen={activeSheet === 'profile'}
      onClose={() => setActiveSheet('none')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Banner y Avatar */}
        <div
          style={{
            height: 70,
            borderRadius: 'var(--radius-md)',
            backgroundColor: currentUser.bannerColor || 'var(--brand)',
            position: 'relative',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: -24,
              left: 14,
              width: 60,
              height: 60,
              borderRadius: 'var(--radius-full)',
              border: '4px solid var(--bg-secondary)',
              overflow: 'hidden',
            }}
          >
            <img
              src={currentUser.avatarUrl || currentUser.avatar}
              alt={currentUser.displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* Datos del usuario y saldo de puntos */}
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--header-primary)' }}>
            {currentUser.displayName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            @{currentUser.username}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'var(--brand-light)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              marginTop: 8,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--brand)',
            }}
          >
            <span>💠 Saldo: {currentUser.points || 840} Puntos Discordia</span>
          </div>
        </div>

        {/* Tarjeta de promoción Nitro */}
        <div
          style={{
            background: 'linear-gradient(135deg, #5865f2 0%, #eb459e 100%)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            color: 'white',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <Sparkles size={18} /> Consigue Discordia Nitro
          </div>
          <p style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
            Desbloquea emojis personalizados globales, transmisiones HD a 60fps y 2 mejoras de servidor mensuales.
          </p>
        </div>

        {/* Botones de acción */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setActiveSheet('none');
            onOpenModal?.('user-profile');
          }}
        >
          Editar Perfil
        </button>
      </div>
    </BottomSheet>
  );
}
