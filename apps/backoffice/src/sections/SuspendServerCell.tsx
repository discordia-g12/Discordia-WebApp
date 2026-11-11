import { useEffect, useRef, useState } from 'react';
import { BlockButton, ConfirmDialog, UnderlineInput } from '@web/ui';
import { isServerId, serverSuspensionErrorMessage, useSuspendServer, type AdminServer } from '@discordia/core';
import { Cell, Note } from '../layout/Cell';
import { DialogPortal } from '../layout/DialogPortal';
import styles from './sections.module.css';

/**
 * "Suspender servidor completo": qué servidor (por id, porque el nombre no es único: ADR-002 de Server-Roles) y
 * por qué. Pide confirmación (CA 1: "una vez que el staff confirma") y muestra el resultado o qué hacer si falló.
 *
 * `prefill` lo manda "_suspender" del listado: completa el id, recuerda el nombre para la confirmación y deja el
 * foco en el motivo. La key cambia en cada pedido, así funciona aunque se elija dos veces el mismo servidor.
 */
export function SuspendServerCell({
  prefill = null,
}: { prefill?: { serverId: string; name: string; key: number } | null } = {}) {
  const [serverId, setServerId] = useState('');
  // Nombre del servidor elegido en el listado; deja de valer si se edita el id a mano
  const [picked, setPicked] = useState<{ serverId: string; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [suspended, setSuspended] = useState<AdminServer | null>(null);
  const mutation = useSuspendServer();
  const { reset } = mutation;
  const reasonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!prefill) return;
    setServerId(prefill.serverId);
    setPicked({ serverId: prefill.serverId, name: prefill.name });
    setSuspended(null);
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
      const server = await mutation.mutateAsync({ serverId, reason });
      setSuspended(server);
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
    <Cell title="Suspender servidor" feature="servers.suspend">
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setSuspended(null);
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
                : 'copialo del listado de arriba con "_suspender": el nombre no alcanza, puede haber varios iguales'
          }
        />
        <UnderlineInput
          ref={reasonRef}
          label="motivo"
          required
          value={reason}
          maxLength={512}
          onChange={(e) => setReason(e.target.value)}
          hint="por ejemplo, la denuncia que se investiga; queda en el registro de auditoría"
        />
        <BlockButton type="submit" tone="danger" loading={mutation.isPending} disabled={!canSubmit}>
          Suspender
        </BlockButton>
      </form>

      {mutation.isError && (
        <p role="alert" className={styles.statusError}>
          {serverSuspensionErrorMessage(mutation.error, 'suspend')}
        </p>
      )}
      {suspended && (
        <p role="status" className={styles.success}>
          {suspended.name} quedó suspendido.
        </p>
      )}
      <Note>Ningún miembro puede entrar mientras dure. El contenido se conserva y se puede levantar la suspensión desde la lista de suspendidos.</Note>

      {confirming && (
        <DialogPortal>
          <ConfirmDialog
            action="suspend-server"
            targetName={pickedName ? `${pickedName} (${serverId.trim()})` : serverId.trim()}
            onConfirm={confirm}
            onCancel={() => setConfirming(false)}
          />
        </DialogPortal>
      )}
    </Cell>
  );
}
