import React, { useState, useEffect,  } from 'react';
import {
  X, Check, Copy
} from 'lucide-react';
import { User, Server } from '../../types';
import { createInvite } from '@discordia/core';
import { ModalOverlay } from './ModalOverlay';

export interface InviteModalProps {
  server?: Server;
  isOpen?: boolean;
  onClose: () => void;
}

const EXPIRATION_OPTIONS = [
  { label: '30 minutos', value: '30m' },
  { label: '1 hora', value: '1h' },
  { label: '6 horas', value: '6h' },
  { label: '12 horas', value: '12h' },
  { label: '1 día', value: '1d' },
  { label: '7 días', value: '7d' },
  { label: 'Nunca', value: 'never' },
];

const MAX_USES_OPTIONS = [
  { label: 'Sin límite', value: '0' },
  { label: '1 uso', value: '1' },
  { label: '5 usos', value: '5' },
  { label: '10 usos', value: '10' },
  { label: '25 usos', value: '25' },
  { label: '50 usos', value: '50' },
  { label: '100 usos', value: '100' },
];

/**
 * Diálogo para compartir enlace de invitación al servidor con configuración granular.
 */
export const InviteModal: React.FC<InviteModalProps> = ({
  server,
  isOpen = true,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [expiration, setExpiration] = useState('7d');
  const [maxUses, setMaxUses] = useState('0');
  const [invitedFriends, setInvitedFriends] = useState<Record<string, boolean>>({});
  const [inviteLink, setInviteLink] = useState('');
  const [, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerateInvite = async () => {
    setIsLoading(true);
    try {
      const expiresInSeconds = expiration === '7d' ? 604800 : expiration === '1d' ? 86400 : 0;
      const res = await createInvite(server?.id || '', {
        maxUses: parseInt(maxUses, 10),
        expiresInSeconds
      });
      setInviteLink(`${window.location.origin}/invite/${res.code}`);
    } catch (e) {
      console.error(e);
      setInviteLink('Error al crear invitación');
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    if (isOpen) {
      handleGenerateInvite();
    }
  }, [isOpen, expiration, maxUses]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendDirectInvite = (friendId: string) => {
    setInvitedFriends((prev) => ({ ...prev, [friendId]: true }));
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={480}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={onClose}
          className="btn-icon"
          aria-label="Cerrar modal"
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
        >
          <X size={20} />
        </button>

        <div className="modal-header">
          <h2 className="modal-title" style={{ fontSize: 20 }}>
            Invitar amigos a {server?.name}
          </h2>
          <p className="modal-subtitle">
            Canal predeterminado de bienvenida: <strong style={{ color: 'var(--header-primary)' }}>#general</strong>
          </p>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Enlace generado con botón de copiar */}
          <div>
            <label className="input-label" htmlFor="generated-invite-input">
              O ENVÍA UN ENLACE DE INVITACIÓN AL SERVIDOR
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="generated-invite-input"
                className="discord-input"
                type="text"
                readOnly
                value={inviteLink}
                style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'text' }}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="btn"
                style={{
                  backgroundColor: copied ? 'var(--status-online)' : 'var(--brand)',
                  color: 'white',
                  minWidth: 100,
                  transition: 'all 0.2s',
                }}
              >
                {copied ? (
                  <>
                    <Check size={16} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copiar
                  </>
                )}
              </button>
            </div>
            <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              {expiration === 'never'
                ? 'Tu enlace de invitación no caducará nunca.'
                : `Tu enlace caduca en ${EXPIRATION_OPTIONS.find((o) => o.value === expiration)?.label}.`}
            </span>
          </div>

          {/* Selectores de expiración y límites */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label" htmlFor="expiration-select">EXPIRAR DESPUÉS DE</label>
              <select
                id="expiration-select"
                className="discord-input"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {EXPIRATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label" htmlFor="max-uses-select">NÚMERO MÁXIMO DE USOS</label>
              <select
                id="max-uses-select"
                className="discord-input"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {MAX_USES_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lista rápida de amigos para invitar directamente */}
          <div>
            <div className="input-label">AMIGOS CONECTADOS RECIENTEMENTE</div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                maxHeight: 140,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {Object.values(({} as Record<string, User>)).slice(1, 5).map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img
                      src={user.avatarUrl || user.avatar}
                      alt={user.displayName}
                      style={{ width: 30, height: 30, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
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
                    onClick={() => handleSendDirectInvite(user.id)}
                    className="btn"
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      backgroundColor: invitedFriends[user.id] ? 'var(--bg-modifier-selected)' : 'var(--brand)',
                      color: invitedFriends[user.id] ? 'var(--text-positive)' : 'white',
                    }}
                    disabled={invitedFriends[user.id]}
                  >
                    {invitedFriends[user.id] ? 'Enviado' : 'Invitar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};
