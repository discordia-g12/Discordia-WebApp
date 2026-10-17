//import { Server } from "../../types";
import React, { useState, useEffect } from 'react';
import { getInvitePreview } from '../../api/servers';
import { X } from 'lucide-react';

import { ModalOverlay } from './ModalOverlay';

export interface JoinServerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onJoinServer?: (inviteCode: string) => void;
}

/**
 * Modal para introducir un enlace de invitación con vista previa en tiempo real.
 */
export const JoinServerModal: React.FC<JoinServerModalProps> = ({
  isOpen = true,
  onClose,
  onJoinServer,
}) => {
  const [inviteUrl, setInviteUrl] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/invite/')) {
      return window.location.origin + path;
    }
    return '';
  });
  const [previewServer, setPreviewServer] = useState<any>(null);

  useEffect(() => {
    const rawCode = inviteUrl.split('/').pop();
    if (!rawCode || rawCode.length < 3) {
      setPreviewServer(null);
      return;
    }
    
    const timeout = setTimeout(() => {
      getInvitePreview(rawCode)
        .then((data) => {
          setPreviewServer({
            name: data.server_name,
            description: data.server_description,
            iconUrl: data.server_icon,
            membersCount: data.member_count
          });
        })
        .catch(() => setPreviewServer(null));
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [inviteUrl]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUrl.trim()) return;
    onJoinServer?.(inviteUrl.trim());
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={460}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={onClose}
          className="btn-icon"
          aria-label="Cerrar modal"
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
        >
          <X size={20} />
        </button>

        <form onSubmit={handleSubmit}>
          <div className="modal-header" style={{ textAlign: 'center', paddingTop: 28 }}>
            <h2 className="modal-title" style={{ fontSize: 24 }}>Únete a un servidor</h2>
            <p className="modal-subtitle">
              Introduce una invitación o enlace a continuación para entrar a una comunidad existente.
            </p>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="input-label" htmlFor="invite-input">
                ENLACE DE INVITACIÓN *
              </label>
              <input
                id="invite-input"
                className="discord-input"
                type="text"
                value={inviteUrl}
                onChange={(e) => setInviteUrl(e.target.value)}
                placeholder="https://discordia.gg/h7K9xQ2 o h7K9xQ2"
              />
              <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                Las invitaciones tienen un aspecto como: <code>h7K9xQ2</code> o{' '}
                <code>https://discordia.gg/indie-devs</code>
              </span>
            </div>

            {/* Vista previa del servidor detectado */}
            {previewServer && (
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                  VISTA PREVIA DEL SERVIDOR
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={previewServer?.iconUrl || previewServer?.icon}
                    alt={previewServer?.name}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 'var(--radius-md)',
                      objectFit: 'cover',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: 'var(--header-primary)', fontSize: 15 }}>
                        {previewServer?.name}
                      </span>
                      <span className="badge badge-brand" style={{ fontSize: 10 }}>Comunidad</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {previewServer?.description}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: 11 }}>

                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                        <span className="status-dot offline" style={{ width: 8, height: 8 }} />
                        {previewServer?.membersCount || 1} Miembros totales
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-link" onClick={onClose}>
              Atrás
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!inviteUrl.trim()}
            >
              Unirse al Servidor
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
};
