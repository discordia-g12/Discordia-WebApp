import { useState, type ChangeEvent } from 'react';
import { IMAGE_UPLOAD_ACCEPT, imageFileError } from '@discordia/core';
import type { User } from '../../types';
import { ActionLink, BlockButton, Modal, ModalActions, ModalForm, SquareAvatar, UnderlineInput } from '../../ui';
import styles from './CreateServerModal.module.css';

export interface CreateServerModalProps {
  currentUser?: User;
  onClose: () => void;
  /** Crea el servidor; si sale bien, quien lo llama cierra el modal. `icon` llega solo si se eligió uno. */
  onCreateServer: (data: { name: string; icon?: File }) => void | Promise<void>;
  onJoinExisting?: () => void;
}

/**
 * Crear servidor (rediseño): nombre e ícono opcional. El backend crea •general y •Voz General, y guarda el
 * ícono recortado a 256×256 (ADR-003 de Auth-User-Service).
 */
export function CreateServerModal({ currentUser, onClose, onCreateServer, onJoinExisting }: CreateServerModalProps) {
  const [name, setName] = useState(`Servidor de ${currentUser?.displayName || currentUser?.username || 'Discordia'}`);
  const [icon, setIcon] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickIcon = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo después de quitarlo
    e.target.value = '';
    if (!file) return;

    const error = imageFileError(file);
    if (error) {
      setIconError(error);
      return;
    }

    setIconError(null);
    setIcon(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') setIconPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeIcon = () => {
    setIcon(null);
    setIconPreview(null);
    setIconError(null);
  };

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onCreateServer(icon ? { name: name.trim(), icon } : { name: name.trim() });
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

        <div className={styles.icon}>
          <p className={styles.iconLabel}>Ícono</p>
          <div className={styles.iconRow}>
            <SquareAvatar user={{ displayName: name.trim() || 'Servidor', username: '', avatar: iconPreview }} size={48} />
            <label className={styles.fileAction}>
              {icon ? '_elegir otro' : '_elegir ícono'}
              <input
                type="file"
                accept={IMAGE_UPLOAD_ACCEPT}
                onChange={pickIcon}
                disabled={busy}
                aria-label="Ícono del servidor"
                aria-describedby="server-icon-message"
                className={styles.srOnly}
              />
            </label>
            {icon && (
              <ActionLink onPress={removeIcon} disabled={busy}>
                quitar
              </ActionLink>
            )}
          </div>
          <p id="server-icon-message" className={iconError ? styles.iconError : styles.iconNote} role={iconError ? 'alert' : undefined}>
            / {iconError ?? 'Opcional. JPEG, PNG o WebP, hasta 5 MB. Se recorta al centro.'}
          </p>
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
