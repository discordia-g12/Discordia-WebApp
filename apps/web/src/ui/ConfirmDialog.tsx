import { useState } from 'react';
import type { ConfirmAction } from '../types';
import { ActionLink } from './ActionLink';
import { BlockButton } from './BlockButton';
import { Modal, ModalActions } from './Modal';
import { UnderlineInput } from './UnderlineInput';

export interface ConfirmDialogProps {
  action: NonNullable<ConfirmAction>;
  /** Lo que se confirma: servidor, canal, usuario o el canal de voz de destino. */
  targetName: string;
  /** Al cambiar de canal de voz, el canal actual. */
  targetDetail?: string;
  /** Si devuelve una promesa, el botón queda cargando hasta que termine. */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

interface ConfirmCopy {
  title: string;
  text: string;
  confirm: string;
  danger: boolean;
}

function copyFor(action: NonNullable<ConfirmAction>, name: string, detail?: string): ConfirmCopy {
  switch (action) {
    case 'delete-server':
      return { title: '¿Eliminar servidor?', text: `Se borra ${name} con todos sus canales, mensajes y roles. No se puede deshacer.`, confirm: 'Eliminar', danger: true };
    case 'leave-server':
      return { title: '¿Abandonar servidor?', text: `Vas a salir de ${name}. Para volver vas a necesitar otra invitación.`, confirm: 'Abandonar', danger: true };
    case 'ban-member':
      return { title: '¿Banear?', text: `@${name} sale del servidor y no puede volver a entrar.`, confirm: 'Banear', danger: true };
    case 'kick-member':
      return { title: '¿Expulsar?', text: `@${name} sale del servidor. Puede volver con una invitación.`, confirm: 'Expulsar', danger: true };
    case 'delete-channel':
      return { title: '¿Eliminar canal?', text: `Se borra •${name} con todos sus mensajes. No se puede deshacer.`, confirm: 'Eliminar', danger: true };
    case 'switch-voice-channel':
      return { title: '¿Cambiar de canal?', text: `Estás conectado a ${detail || 'otro canal de voz'}. Si entrás a ${name}, salís de ese canal.`, confirm: 'Cambiar', danger: false };
    case 'delete-category':
      return { title: '¿Eliminar categoría?', text: `Se borra la categoría ${name}. Sus canales quedan sin categoría.`, confirm: 'Eliminar', danger: true };
    case 'logout':
      return { title: '¿Cerrar sesión?', text: 'Vas a salir de Discordia en este navegador.', confirm: 'Cerrar sesión', danger: false };
    case 'transfer-ownership':
      return { title: '¿Transferir el servidor?', text: `El servidor pasa a ser de @${name} y perdés el control total sobre él.`, confirm: 'Transferir', danger: true };
    case 'block-user':
      return { title: '¿Bloquear?', text: `No van a poder escribirse con ${name} hasta que lo desbloquees. El historial se conserva y, si eran amigos, dejan de serlo.`, confirm: 'Bloquear', danger: true };
    case 'remove-friend':
      return { title: '¿Eliminar amigo?', text: `${name} deja de ser tu amigo. La conversación y el historial se conservan.`, confirm: 'Eliminar', danger: true };
    case 'delete-message':
      return { title: '¿Eliminar mensaje?', text: '¿Seguro que querés eliminar este mensaje? No se puede deshacer.', confirm: 'Eliminar', danger: true };
  }
}

/**
 * Confirmación de una acción crítica (docs/TODO-REDISENO.md, sección 3): título en display, texto
 * chico, _cancelar y el bloque de la acción (rojo solo si es destructiva). Eliminar un servidor pide
 * escribir su nombre.
 */
export function ConfirmDialog({ action, targetName, targetDetail, onConfirm, onCancel }: ConfirmDialogProps) {
  const [typedName, setTypedName] = useState('');
  const [busy, setBusy] = useState(false);
  const copy = copyFor(action, targetName, targetDetail);
  const needsName = action === 'delete-server';
  const nameMatches = typedName.trim().toLowerCase() === targetName.trim().toLowerCase();

  const confirm = async () => {
    if (needsName && !nameMatches) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={copy.title} role="alertdialog" onClose={onCancel}>
      <p>{copy.text}</p>
      {needsName && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
        >
          <UnderlineInput
            label="Escribí el nombre del servidor para confirmar"
            hint={targetName}
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        </form>
      )}
      <ModalActions>
        <ActionLink onPress={onCancel}>cancelar</ActionLink>
        <BlockButton tone={copy.danger ? 'danger' : 'default'} onPress={confirm} disabled={needsName && !nameMatches} loading={busy}>
          {copy.confirm}
        </BlockButton>
      </ModalActions>
    </Modal>
  );
}
