
import {
  Sparkles,
} from 'lucide-react';
import { BottomSheet } from './shared';
import type { MobileShellState } from './useMobileShellState';
import styles from './ProfileSheet.module.css';

/** Sección "2. PROFILE SHEET" de MobileShell. */
export function ProfileSheet({ s }: { s: MobileShellState }) {
  const { currentUser, onOpenModal, activeSheet, setActiveSheet } = s;
  return (
    <BottomSheet
      isOpen={activeSheet === 'profile'}
      onClose={() => setActiveSheet('none')}
    >
      <div className={styles.div}>
        {/* Banner y Avatar */}
        <div
          className={styles.bannerAvatar} style={{ backgroundColor: currentUser.bannerColor || 'var(--brand)' }}
        >
          <div className={styles.bannerAvatarDiv}>
            <img
              src={currentUser.avatarUrl || currentUser.avatar}
              alt={currentUser.displayName}
              className={styles.bannerAvatarDivImg}
            />
          </div>
        </div>

        {/* Datos del usuario y saldo de puntos */}
        <div>
          <div className={styles.datosUsuarioSaldoPuntosDiv}>
            {currentUser.displayName}
          </div>
          <div className={styles.datosUsuarioSaldoPuntosDiv2}>
            @{currentUser.username}
          </div>
          <div className={styles.datosUsuarioSaldoPuntosDiv3}>
            <span>💠 Saldo: {currentUser.points || 840} Puntos Discordia</span>
          </div>
        </div>

        {/* Tarjeta de promoción Nitro */}
        <div className={styles.tarjetaPromocionNitro}>
          <div className={styles.tarjetaPromocionNitroDiv}>
            <Sparkles size={18} /> Consigue Discordia Nitro
          </div>
          <p className={styles.tarjetaPromocionNitroP}>
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
