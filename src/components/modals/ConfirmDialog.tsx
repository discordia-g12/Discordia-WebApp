import React, { useState} from 'react';
import { X, AlertTriangle, Trash2, LogOut, UserX} from 'lucide-react';
import { ConfirmAction } from '../../types';
// import { createInvite } from '../../api/servers';
import { ModalOverlay } from './ModalOverlay';

export interface ConfirmDialogProps {
  action?: ConfirmAction;
  targetName?: string;
  targetDetail?: string;
  isOpen?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo de confirmación para acciones críticas. Para 'delete-server' requiere
 * escribir el nombre exacto del servidor.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  action = 'delete-server',
  targetName = 'Indie Developers',
  targetDetail,
  isOpen = true,
  onConfirm,
  onCancel,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  if (!isOpen || !action) return null;

  const isDeleteServer = action === 'delete-server';
  const isMatch = isDeleteServer
    ? confirmationInput.trim().toLowerCase() === targetName.trim().toLowerCase()
    : true;

  // Metadata por tipo de acción
  const actionConfigs: Record<
    NonNullable<ConfirmAction>,
    { title: string; desc: string; confirmBtn: string; icon: React.ReactNode; isDanger: boolean }
  > = {
    'delete-server': {
      title: `Eliminar servidor '${targetName}'`,
      desc: `¿Estás completamente seguro de que deseas eliminar ${targetName}? Esta acción es irreversible y eliminará todos los canales, mensajes y roles para siempre.`,
      confirmBtn: 'Eliminar Servidor',
      icon: <Trash2 size={24} color="var(--danger)" />,
      isDanger: true,
    },
    'leave-server': {
      title: `Abandonar '${targetName}'`,
      desc: `¿Estás seguro de que deseas abandonar ${targetName}? No podrás volver a unirte a menos que te vuelvan a invitar.`,
      confirmBtn: 'Abandonar Servidor',
      icon: <LogOut size={24} color="var(--danger)" />,
      isDanger: true,
    },
    'ban-member': {
      title: `Banear a @${targetName}`,
      desc: `¿Estás seguro de que deseas banear a @${targetName}? Se eliminarán sus mensajes recientes y no podrá reingresar al servidor.`,
      confirmBtn: 'Banear Miembro',
      icon: <UserX size={24} color="var(--danger)" />,
      isDanger: true,
    },
    'kick-member': {
      title: `Expulsar a @${targetName}`,
      desc: `¿Estás seguro de que deseas expulsar a @${targetName} del servidor? Podrá volver si tiene una invitación válida.`,
      confirmBtn: 'Expulsar',
      icon: <LogOut size={24} color="var(--danger)" />,
      isDanger: true,
    },
    'delete-channel': {
      title: `Eliminar canal #${targetName}`,
      desc: `¿Estás seguro de que quieres eliminar #${targetName}? Todos los mensajes dentro de este canal se perderán de manera permanente.`,
      confirmBtn: 'Eliminar Canal',
      icon: <Trash2 size={24} color="var(--danger)" />,
      isDanger: true,
    },
    'transfer-ownership': {
      title: `Transferir propiedad a @${targetName}`,
      desc: `Vas a ceder el control total del servidor a @${targetName}. Perderás los privilegios de propietario supremo.`,
      confirmBtn: 'Transferir Propiedad',
      icon: <AlertTriangle size={24} color="var(--text-warning)" />,
      isDanger: true,
    },
  };

  const config = actionConfigs[action] || actionConfigs['delete-server'];

  return (
    <ModalOverlay onClose={onCancel} maxWidth={440}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={onCancel}
          className="btn-icon"
          aria-label="Cerrar confirmación"
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
        >
          <X size={20} />
        </button>

        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {config.icon}
            <h2 className="modal-title" style={{ fontSize: 19, margin: 0 }}>
              {config.title}
            </h2>
          </div>
          <p className="modal-subtitle" style={{ lineHeight: 1.5 }}>
            {config.desc}
          </p>
          {targetDetail && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Detalle: {targetDetail}
            </div>
          )}
        </div>

        {isDeleteServer && (
          <div className="modal-body" style={{ paddingTop: 0 }}>
            <label className="input-label" htmlFor="server-delete-confirm-input">
              INTRODUCE EL NOMBRE DEL SERVIDOR PARA CONFIRMAR:
            </label>
            <div
              style={{
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-xs)',
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--header-primary)',
                letterSpacing: '0.02em',
              }}
            >
              {targetName}
            </div>
            <input
              id="server-delete-confirm-input"
              className="discord-input"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Escribe el nombre aquí..."
              autoFocus
            />
          </div>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className={`btn ${config.isDanger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={!isMatch}
          >
            {config.confirmBtn}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
};
