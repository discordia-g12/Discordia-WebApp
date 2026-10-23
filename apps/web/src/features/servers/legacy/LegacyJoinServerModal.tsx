//import { Server } from "../../types";
import React, { useState } from 'react';
import { useInvitePreview } from '../serverActions';
import { X } from 'lucide-react';

import { ModalOverlay } from '../../../ui/legacy/ModalOverlay';
import styles from './LegacyJoinServerModal.module.css';

export interface JoinServerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onJoinServer?: (inviteCode: string) => void;
}

/**
 * Modal para introducir un enlace de invitación con vista previa en tiempo real.
 */
export const LegacyJoinServerModal: React.FC<JoinServerModalProps> = ({
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
  const previewServer = useInvitePreview(inviteUrl);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUrl.trim()) return;
    onJoinServer?.(inviteUrl.trim());
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={460}>
      <div className={styles.div}>
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
              <span className={styles.span}>
                Las invitaciones tienen un aspecto como: <code>h7K9xQ2</code> o{' '}
                <code>https://discordia.gg/indie-devs</code>
              </span>
            </div>

            {/* Vista previa del servidor detectado */}
            {previewServer && (
              <div className={styles.div2}>
                <div className={styles.previaServidor}>
                  VISTA PREVIA DEL SERVIDOR
                </div>
                <div className={styles.div3}>
                  <img
                    src={previewServer?.iconUrl}
                    alt={previewServer?.name}
                    className={styles.img}
                  />
                  <div className={styles.div4}>
                    <div className={styles.div5}>
                      <span className={styles.span2}>
                        {previewServer?.name}
                      </span>
                      <span className="badge badge-brand" style={{ fontSize: 10 }}>Comunidad</span>
                    </div>
                    <div className={styles.div6}>
                      {previewServer?.description}
                    </div>
                    <div className={styles.div7}>

                      <span className={styles.span3}>
                        <span className="status-dot offline" style={{ width: 8, height: 8 }} />
                        {previewServer?.memberCount || 1} Miembros totales
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
