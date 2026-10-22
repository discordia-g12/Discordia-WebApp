import React, { useEffect } from 'react';


export interface ModalOverlayProps {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string | number;
  className?: string;
  backdropBlur?: boolean;
}

/**
 * Contenedor modal con fondo difuminado y cierre automático al interactuar fuera.
 */
export const ModalOverlay: React.FC<ModalOverlayProps> = ({
  children,
  onClose,
  maxWidth = '480px',
  className = '',
  backdropBlur = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={`modal-overlay ${className}`}
      onClick={onClose}
      style={{
        backdropFilter: backdropBlur ? 'blur(6px)' : undefined,
        WebkitBackdropFilter: backdropBlur ? 'blur(6px)' : undefined,
      }}
    >
      <div
        className="modal-container"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
};
