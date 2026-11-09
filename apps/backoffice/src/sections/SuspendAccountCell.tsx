import { useEffect, useRef, useState } from 'react';
import { BlockButton, ConfirmDialog, UnderlineInput } from '@web/ui';
import { platformAccountLabel, suspensionErrorMessage, useSuspendAccount, type PlatformAccount } from '@discordia/core';
import { Cell, Note } from '../layout/Cell';
import { DialogPortal } from '../layout/DialogPortal';
import styles from './sections.module.css';

/**
 * "Suspender usuario a nivel plataforma": a quién (email, @usuario o id) y por qué. Pide confirmación (CA 1:
 * "cuando el staff confirma la suspensión") y muestra el resultado o qué hacer si falló. Si no es staff, Kong y
 * Auth-User responden 403 (CA 3) y se muestra ese mensaje.
 *
 * `prefill` lo manda "_suspender" del listado: completa la cuenta y deja el foco en el motivo. La key cambia en
 * cada pedido, así funciona aunque se elija dos veces la misma cuenta.
 */
export function SuspendAccountCell({ prefill = null }: { prefill?: { user: string; key: number } | null } = {}) {
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [suspended, setSuspended] = useState<PlatformAccount | null>(null);
  const mutation = useSuspendAccount();
  const { reset } = mutation;
  const reasonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!prefill) return;
    setTarget(prefill.user);
    setSuspended(null);
    reset();
    reasonRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    reasonRef.current?.focus();
    // Solo cuando llega un pedido nuevo (cambia la key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.key]);

  const canSubmit = target.trim() !== '' && reason.trim() !== '' && !mutation.isPending;

  const confirm = async () => {
    try {
      const account = await mutation.mutateAsync({ user: target, reason });
      setSuspended(account);
      setTarget('');
      setReason('');
    } catch {
      // El error queda en mutation.error y se muestra abajo
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Cell title="Suspender usuario" feature="users.suspend">
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
          label="usuario"
          required
          value={target}
          maxLength={255}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="email, @usuario o id"
        />
        <UnderlineInput
          ref={reasonRef}
          label="motivo"
          required
          value={reason}
          maxLength={512}
          onChange={(e) => setReason(e.target.value)}
          hint="queda guardado con la suspensión y en el registro de auditoría"
        />
        <BlockButton type="submit" tone="danger" loading={mutation.isPending} disabled={!canSubmit}>
          Suspender
        </BlockButton>
      </form>

      {mutation.isError && (
        <p role="alert" className={styles.statusError}>
          {suspensionErrorMessage(mutation.error, 'suspend')}
        </p>
      )}
      {suspended && (
        <p role="status" className={styles.success}>
          {platformAccountLabel(suspended)} quedó suspendida.
        </p>
      )}
      <Note>No va a poder iniciar sesión, se cierran sus sesiones abiertas y su perfil deja de estar disponible.</Note>

      {confirming && (
        <DialogPortal>
          <ConfirmDialog action="suspend-user" targetName={target.trim()} onConfirm={confirm} onCancel={() => setConfirming(false)} />
        </DialogPortal>
      )}
    </Cell>
  );
}
