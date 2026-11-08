import { useState } from 'react';
import { ActionLink, BlockButton, ConfirmDialog, EmptyState, Skeleton } from '@web/ui';
import {
  isForbidden,
  isUnauthorized,
  platformAccountLabel,
  suspensionErrorMessage,
  useReactivateAccount,
  useSuspendedAccounts,
  type PlatformAccount,
} from '@discordia/core';
import { Cell, Note, Row } from '../layout/Cell';
import { DialogPortal } from '../layout/DialogPortal';
import { formatDate } from './types';
import styles from './sections.module.css';

/**
 * "Reactivar usuario suspendido": las cuentas suspendidas, con cuándo y por qué, y la acción de reactivarlas
 * (con confirmación). Cargando, vacío y error se muestran explícitos.
 */
export function ReactivateAccountCell() {
  const query = useSuspendedAccounts();
  const mutation = useReactivateAccount();
  const [target, setTarget] = useState<PlatformAccount | null>(null);
  const [reactivated, setReactivated] = useState<string | null>(null);

  const confirm = async () => {
    if (!target) return;
    try {
      const account = await mutation.mutateAsync(target.userId);
      setReactivated(platformAccountLabel(account));
    } catch {
      // El error queda en mutation.error y se muestra abajo
    } finally {
      setTarget(null);
    }
  };

  // Sin permiso o sin sesión, reintentar no cambia nada
  const authError = query.isError && (isForbidden(query.error) || isUnauthorized(query.error));

  return (
    <Cell title="Reactivar usuario" feature="users.reactivate">
      {query.isPending && <Skeleton lines={3} label="Cargando las cuentas suspendidas" />}

      {query.isError && (
        <div className={styles.form}>
          <p role="alert" className={styles.statusError}>
            {suspensionErrorMessage(query.error, 'list')}
          </p>
          {!authError && (
            <BlockButton loading={query.isFetching} onPress={() => void query.refetch()}>
              Reintentar
            </BlockButton>
          )}
        </div>
      )}

      {query.data && query.data.length === 0 && (
        <EmptyState title="no hay cuentas suspendidas" hint="las cuentas suspendidas van a aparecer acá" />
      )}

      {query.data && query.data.length > 0 && (
        <ul className={styles.accountList} aria-label="Cuentas suspendidas">
          {query.data.map((account) => (
            <li key={account.userId}>
              <Row
                title={platformAccountLabel(account)}
                description={[
                  account.suspendedAt ? `suspendida el ${formatDate(account.suspendedAt)}` : 'suspendida',
                  account.suspensionReason,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              >
                <ActionLink
                  onPress={() => {
                    setReactivated(null);
                    mutation.reset();
                    setTarget(account);
                  }}
                  disabled={mutation.isPending}
                >
                  reactivar
                </ActionLink>
              </Row>
            </li>
          ))}
        </ul>
      )}

      {mutation.isError && (
        <p role="alert" className={styles.statusError}>
          {suspensionErrorMessage(mutation.error, 'reactivate')}
        </p>
      )}
      {reactivated && (
        <p role="status" className={styles.success}>
          {reactivated} volvió a estar activa.
        </p>
      )}
      <Note>Vuelve a poder iniciar sesión y su perfil vuelve a estar disponible.</Note>

      {target && (
        <DialogPortal>
          <ConfirmDialog
            action="reactivate-user"
            targetName={platformAccountLabel(target)}
            onConfirm={confirm}
            onCancel={() => setTarget(null)}
          />
        </DialogPortal>
      )}
    </Cell>
  );
}
