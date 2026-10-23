import { useState } from 'react';
import { ActionLink, BlockButton, Modal, ModalActions, ModalForm, UnderlineInput } from '../../ui';
import { useInvitePreview } from './serverActions';
import styles from './JoinServerModal.module.css';

export interface JoinServerModalProps {
  onClose: () => void;
  /** Se une con la invitación; si falla, rechaza con el mensaje para mostrar en el campo. */
  onJoinServer: (invite: string) => Promise<void>;
}

/** Invitación que vino en la URL (/invite/<código>), para no tener que pegarla. */
function inviteFromUrl(): string {
  const path = window.location.pathname;
  return path.startsWith('/invite/') ? window.location.origin + path : '';
}

/**
 * Unirse a un servidor (rediseño): el enlace o el código en un campo subrayado y, mientras se escribe,
 * la vista previa del servidor. Si la invitación no sirve, el error queda en el campo y el modal sigue
 * abierto.
 */
export function JoinServerModal({ onClose, onJoinServer }: JoinServerModalProps) {
  const [invite, setInvite] = useState(inviteFromUrl);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const preview = useInvitePreview(invite);

  const submit = async () => {
    if (!invite.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await onJoinServer(invite);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo unir al servidor.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Unirse" description="con una invitación a un servidor" onClose={onClose}>
      <ModalForm onSubmit={submit}>
        <UnderlineInput
          label="Invitación"
          required
          value={invite}
          onChange={(e) => {
            setInvite(e.target.value);
            setError(undefined);
          }}
          placeholder="https://app.discordia.lol/invite/h7K9xQ2"
          hint="Pegá el enlace entero o solo el código (h7K9xQ2)."
          error={error}
          autoComplete="off"
          autoFocus
        />

        {preview && (
          <section className={styles.preview} aria-label="Vista previa del servidor">
            <div className={styles.strip}>
              {preview.iconUrl ? <img src={preview.iconUrl} alt="" /> : <span aria-hidden="true">{preview.name.slice(0, 2)}</span>}
            </div>
            <div className={styles.info}>
              <p className={styles.name}>{preview.name}</p>
              {preview.description && <p className={styles.description}>{preview.description}</p>}
              {preview.memberCount !== undefined && (
                <p className={styles.meta}>{preview.memberCount === 1 ? '1 miembro' : `${preview.memberCount} miembros`}/</p>
              )}
            </div>
          </section>
        )}

        <ModalActions>
          <ActionLink onPress={onClose}>cancelar</ActionLink>
          <BlockButton type="submit" disabled={!invite.trim()} loading={busy}>
            Unirme
          </BlockButton>
        </ModalActions>
      </ModalForm>
    </Modal>
  );
}
