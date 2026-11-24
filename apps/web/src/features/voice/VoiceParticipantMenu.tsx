import React from 'react';
import { User as UserIcon, Volume2, VolumeX } from 'lucide-react';
import { User } from '../../types';
import { ContextMenu, ContextMenuItem } from '../../ui';

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

/** Menú contextual (click derecho) de un participante de voz. */
export const VoiceParticipantMenu: React.FC<VoiceParticipantMenuProps> = ({
  user,
  x,
  y,
  isLocallyMuted,
  onToggleLocalMute,
  onViewProfile,
  onClose,
}) => (
  <ContextMenu x={x} y={y} label={`Opciones de ${user.displayName}`} onClose={onClose}>
    {onViewProfile && (
      <ContextMenuItem
        icon={<UserIcon size={14} strokeWidth={1.5} aria-hidden="true" />}
        onPress={() => {
          onViewProfile(user);
          onClose();
        }}
      >
        Ver perfil
      </ContextMenuItem>
    )}
    <ContextMenuItem
      role="menuitemcheckbox"
      checked={isLocallyMuted}
      icon={
        isLocallyMuted ? (
          <Volume2 size={14} strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <VolumeX size={14} strokeWidth={1.5} aria-hidden="true" />
        )
      }
      onPress={() => {
        onToggleLocalMute(user.id);
        onClose();
      }}
    >
      {isLocallyMuted ? 'Dejar de silenciar para mí' : 'Silenciar para mí'}
    </ContextMenuItem>
  </ContextMenu>
);
