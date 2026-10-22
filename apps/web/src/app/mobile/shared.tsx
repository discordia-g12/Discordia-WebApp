import React, { useState } from 'react';
import {
  Check,
  X,
} from 'lucide-react';
import {
  Server,
} from '../../types';

// Tipos, helpers y componentes auxiliares de MobileShell, compartidos por sus pantallas y hojas.

/* ==========================================================================
   TIPOS Y PROPS PARA EL SHELL MÓVIL
   ========================================================================== */

export type MobileScreen = 'home' | 'channels' | 'chat' | 'voice';

export type ActiveSheet = 'none' | 'server' | 'profile' | 'member' | 'add-friend';

export function formatMessageTimestamp(isoDate?: string): string {
  if (!isoDate) return '12:00';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) {
    return timeStr;
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year} ${timeStr}`;
}

export /* ==========================================================================
   COMPONENTE AUXILIAR: BOTTOM SHEET DESLIZABLE
   ========================================================================== */

  interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string | number;
}

export const EMPTY_SERVER: Server = {
  id: '',
  name: '',
  ownerId: '',
  categories: [],
  roles: [],
  members: [],
  boostLevel: 0,
  boostCount: 0,
};

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = '85vh',
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          maxHeight,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-floating)',
          animation: 'slideUp 0.25s ease',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Asa o barra de arrastre superior */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px 0' }}>
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'var(--interactive-muted)',
            }}
          />
        </div>

        {/* Cabecera opcional */}
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 20px 12px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--header-primary)', margin: 0 }}>
              {title}
            </h3>
            <button onClick={onClose} className="btn-icon" aria-label="Cerrar panel">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Contenido */}
        <div style={{ padding: '12px 20px' }}>{children}</div>
      </div>
    </div>
  );
};

export /* ==========================================================================
   SUBCOMPONENTE: CONTENIDO DE ADD FRIEND SHEET
   ========================================================================== */

  const AddFriendSheetContent: React.FC = () => {
    const [friendTag, setFriendTag] = useState('');
    const [isSent, setIsSent] = useState(false);
    const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

    const handleSend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!friendTag.trim()) return;
      setIsSent(true);
      setTimeout(() => {
        setFriendTag('');
        setIsSent(false);
      }, 2500);
    };

    const handleAddSuggested = (id: string) => {
      setAddedIds((prev) => ({ ...prev, [id]: true }));
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Puedes añadir amigos mediante su nombre de usuario de Discordia.
        </p>

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text"
            className="discord-input"
            placeholder="@usuario#0000 o nombre_de_usuario"
            value={friendTag}
            onChange={(e) => setFriendTag(e.target.value)}
          />
          <button
            type="submit"
            disabled={!friendTag.trim()}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {isSent ? '¡Solicitud Enviada!' : 'Enviar solicitud de amistad'}
          </button>
        </form>

        {isSent && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(35, 165, 90, 0.15)',
              border: '1px solid var(--status-online)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-positive)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Check size={16} /> ¡Solicitud de amistad enviada con éxito!
          </div>
        )}

        {/* Sugerencias de amigos */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
            SUGERENCIAS DE AMIGOS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {([] as any[]).slice(2, 6).map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={user.avatarUrl || user.avatar}
                    alt={user.displayName}
                    style={{ width: 34, height: 34, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--header-primary)' }}>
                      {user.displayName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      @{user.username}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddSuggested(user.id)}
                  disabled={addedIds[user.id]}
                  className="btn"
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    backgroundColor: addedIds[user.id] ? 'var(--bg-modifier-selected)' : 'var(--brand)',
                    color: addedIds[user.id] ? 'var(--text-positive)' : 'white',
                  }}
                >
                  {addedIds[user.id] ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={12} /> Enviada
                    </span>
                  ) : (
                    'Añadir'
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
