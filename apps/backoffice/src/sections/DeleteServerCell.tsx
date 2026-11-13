import { useEffect, useRef, useState } from 'react';
import { BlockButton, ConfirmDialog, UnderlineInput } from '@web/ui';
import {
  isServerId,
  serverSuspensionErrorMessage,
  useDeleteServerByStaff,
  type DeletedAdminServer,
} from '@discordia/core';
import { Cell, Note } from '../layout/Cell';
import { DialogPortal } from '../layout/DialogPortal';
import styles from './sections.module.css';

/**
 * "Eliminar servidor desde el backoffice": qué servidor (por id, porque el nombre no es único) y por qué.
 * Pide confirmación explícita (CA 1: "Dado que un usuario del staff confirma la eliminación de un servidor")
 * antes de borrar permanentemente el servidor y todos sus canales, mensajes y roles.
 *
 * `prefill` lo manda "_eliminar" del listado: completa el id, recuerda el nombre para la confirmación y deja
 * el foco en el motivo.
 */
export function DeleteServerCell({
  prefill = null,
}: { prefill?: { serverId: string; name: string; key: number } | null } = {}) {
  const [serverId, setServerId] = useState('');
  const [picked, setPicked] = useState<{ serverId: string; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState<DeletedAdminServer | null>(null);
  const mutation = useDeleteServerByStaff();
  const { reset } = mutation;
  const reasonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!prefill) return;
    setServerId(prefill.serverId);
    setPicked({ serverId: prefill.serverId, name: prefill.name });
    setDeleted(null);
    reset();
    reasonRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    reasonRef.current?.focus();
    // Solo cuando llega un pedido nuevo (cambia la key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.key]);

  const pickedName = picked && picked.serverId === serverId.trim() ? picked.name : null;

  const idLooksWrong = serverId.trim() !== '' && !isServerId(serverId);
  const canSubmit = isServerId(serverId) && reason.trim() !== '' && !mutation.isPending;

  const confirm = async () => {
    try {
      const result = await mutation.mutateAsync({ serverId, reason });
      setDeleted(result);
      setServerId('');
      setPicked(null);
      setReason('');
    } catch {
      // El error queda en mutation.error y se muestra abajo
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Cell title="Eliminar servidor" feature="servers.delete">
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setDeleted(null);
          mutation.reset();
          setConfirming(true);
        }}
      >
        <UnderlineInput
          label="id del servidor"
          required
          value={serverId}
          maxLength={36}
          onChange={(e) => setServerId(e.target.value)}
          placeholder="3f2a…-…"
          error={idLooksWrong ? 'el id es un UUID, por ejemplo 3f2a9c1e-…' : undefined}
          hint={
            idLooksWrong
              ? undefined
              : pickedName
                ? `servidor: ${pickedName}`
                : 'copialo del listado de arriba con "_eliminar": el nombre no alcanza, puede haber varios iguales'
          }
        />
        <UnderlineInput
          ref={reasonRef}
          label="motivo"
          required
          value={reason}
          maxLength={512}
          onChange={(e) => setReason(e.target.value)}
          hint="por ejemplo, incumplimiento grave de los términos de uso; queda en el registro del evento"
        />
        <BlockButton type="submit" tone="danger" loading={mutation.isPending} disabled={!canSubmit}>
          Eliminar servidor
        </BlockButton>
      </form>

      {mutation.isError && (
        <p role="alert" className={styles.statusError}>
          {serverSuspensionErrorMessage(mutation.error, 'delete')}
        </p>
      )}
      {deleted && (
        <p role="status" className={styles.success}>
          {deleted.name} fue eliminado permanentemente.
        </p>
      )}
      <Note>Se borran para siempre sus canales, mensajes y roles. No se puede deshacer.</Note>

      {confirming && (
        <DialogPortal>
          <ConfirmDialog
            action="delete-server-staff"
            targetName={pickedName ? `${pickedName} (${serverId.trim()})` : serverId.trim()}
            onConfirm={confirm}
            onCancel={() => setConfirming(false)}
          />
        </DialogPortal>
      )}
    </Cell>
  );
}
