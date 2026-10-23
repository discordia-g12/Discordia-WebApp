import React, { useState } from 'react';
import {
  Check,
  X,
} from 'lucide-react';
import {
  Server,
} from '../../../types';
import styles from './shared.module.css';

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
      className={styles.bottomSheetRoot}
      onClick={onClose}
    >
      <div
        className={styles.bottomSheetRootDiv} style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Asa o barra de arrastre superior */}
        <div className={styles.asaBarraArrastreSuperior}>
          <div className={styles.asaBarraArrastreSuperiorDiv} />
        </div>

        {/* Cabecera opcional */}
        {title && (
          <div className={styles.bottomSheetRootDivDiv}>
            <h3 className={styles.bottomSheetRootDivDivH3}>
              {title}
            </h3>
            <button onClick={onClose} className="btn-icon" aria-label="Cerrar panel">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Contenido */}
        <div className={styles.contenido}>{children}</div>
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
      <div className={styles.addFriendSheetContentRoot}>
        <p className={styles.addFriendSheetContentRootP}>
          Puedes añadir amigos mediante su nombre de usuario de Discordia.
        </p>

        <form onSubmit={handleSend} className={styles.addFriendSheetContentRootForm}>
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
          <div className={styles.addFriendSheetContentRootDiv}>
            <Check size={16} /> ¡Solicitud de amistad enviada con éxito!
          </div>
        )}

        {/* Sugerencias de amigos */}
        <div>
          <div className={styles.sugerenciasAmigos}>
            SUGERENCIAS DE AMIGOS
          </div>
          <div className={styles.sugerenciasAmigosDiv}>
            {([] as any[]).slice(2, 6).map((user) => (
              <div
                key={user.id}
                className={styles.sugerenciasAmigosDivDiv}
              >
                <div className={styles.sugerenciasAmigosDivDivDiv}>
                  <img
                    src={user.avatarUrl || user.avatar}
                    alt={user.displayName}
                    className={styles.sugerenciasAmigosDivDivDivImg}
                  />
                  <div>
                    <div className={styles.sugerenciasAmigosDivDivDivDiv}>
                      {user.displayName}
                    </div>
                    <div className={styles.sugerenciasAmigosDivDivDivDiv2}>
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
                    <span className={styles.sugerenciasAmigosDivDivSpan}>
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
