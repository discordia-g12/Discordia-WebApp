import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { User as UserIcon, Volume2, VolumeX } from 'lucide-react';
import { User } from '../types';

const VIEWPORT_MARGIN = 8;

export interface VoiceParticipantMenuProps {
  /** Participante sobre el que se abrió el menú. */
  user: User;
  /** Posición del click derecho (coordenadas de viewport). */
  x: number;
  y: number;
  /** Si el participante está silenciado solo para este cliente. */
  isLocallyMuted: boolean;
  onToggleLocalMute: (userId: string) => void;
  onViewProfile?: (user: User) => void;
  onClose: () => void;
}

/**
 * Menú contextual (click derecho) de un participante de voz.
 * Se cierra con click afuera, Escape, scroll o al perder el foco la ventana.
 */
export const VoiceParticipantMenu: React.FC<VoiceParticipantMenuProps> = ({
  user,
  x,
  y,
  isLocallyMuted,
  onToggleLocalMute,
  onViewProfile,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });

  // Si el menú no entra a la derecha o abajo, se abre hacia el otro lado
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    setPosition({
      left: x + width > window.innerWidth - VIEWPORT_MARGIN ? Math.max(VIEWPORT_MARGIN, x - width) : x,
      top: y + height > window.innerHeight - VIEWPORT_MARGIN ? Math.max(VIEWPORT_MARGIN, y - height) : y,
    });
  }, [x, y]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      aria-label={`Opciones de ${user.displayName}`}
      style={{ top: position.top, left: position.left }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {onViewProfile && (
        <>
          <div
            className="context-menu-item"
            role="menuitem"
            onClick={() => {
              onViewProfile(user);
              onClose();
            }}
          >
            <span>Ver perfil</span>
            <UserIcon size={14} />
          </div>
          <div className="context-menu-separator" />
        </>
      )}
      <div
        className={`context-menu-item ${isLocallyMuted ? '' : 'danger'}`}
        role="menuitemcheckbox"
        aria-checked={isLocallyMuted}
        onClick={() => {
          onToggleLocalMute(user.id);
          onClose();
        }}
      >
        <span>{isLocallyMuted ? 'Dejar de silenciar para mí' : 'Silenciar para mí'}</span>
        {isLocallyMuted ? <Volume2 size={14} /> : <VolumeX size={14} />}
      </div>
    </div>
  );
};
