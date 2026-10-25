import { useState } from 'react';
import type { User } from '../../types';
import { ActionLink, BlockButton, Modal, ModalActions, ModalForm, UnderlineInput } from '../../ui';
import styles from './CreateServerModal.module.css';

export interface CreateServerModalProps {
  currentUser?: User;
  onClose: () => void;
  /** Crea el servidor; si sale bien, quien lo llama cierra el modal. */
  onCreateServer: (data: { name: string }) => void | Promise<void>;
  onJoinExisting?: () => void;
}

/**
 * Crear servidor (rediseño): el nombre y nada más. El backend crea •general y •Voz General; el ícono
 * queda en "próximamente" porque Server-Roles lo recibe pero todavía no lo guarda.
 */
export function CreateServerModal({ currentUser, onClose, onCreateServer, onJoinExisting }: CreateServerModalProps) {
  const [name, setName] = useState(`Servidor de ${currentUser?.displayName || currentUser?.username || 'Discordia'}`);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onCreateServer({ name: name.trim() });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Crear servidor" description="donde vos y tus amigos pasan el rato" onClose={onClose}>
      <ModalForm onSubmit={submit}>
        <UnderlineInput
          label="Nombre del servidor"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          hint="Se crea con •general (texto) y •Voz General (voz); después podés sumar más canales."
          autoFocus
        />

        <div className={styles.soon}>
          <p className={styles.soonLabel}>
            Ícono <span>próximamente</span>
          </p>
          <p className={styles.soonNote}>/ El servidor todavía no guarda el ícono.</p>
        </div>

        <ModalActions>
          {onJoinExisting && <ActionLink onPress={onJoinExisting}>tengo una invitación</ActionLink>}
          <BlockButton type="submit" disabled={!name.trim()} loading={busy}>
            Crear
          </BlockButton>
        </ModalActions>
      </ModalForm>
    </Modal>
  );
}
