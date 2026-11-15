import { useState } from 'react';
import { ActionLink, Choice, ConfirmDialog, UnderlineInput } from '@web/ui';
import {
  ACCOUNT_STATE_FILTER_OPTIONS,
  platformAccountLabel,
  suspensionErrorMessage,
  useReactivateAccount,
  type AccountStateFilter,
  type PlatformAccount,
} from '@discordia/core';
import { DialogPortal } from '../layout/DialogPortal';
import { AccountsTable } from './AccountsTable';
import { ReactivateAccountCell } from './ReactivateAccountCell';
import { SuspendAccountCell } from './SuspendAccountCell';
import { Cell } from '../layout/Cell';
import styles from './sections.module.css';

/**
 * USUARIOS: "Ver listado de usuarios con filtros" (búsqueda por email o nombre, filtro activo o suspendido),
 * "Suspender usuario a nivel plataforma" y "Reactivar usuario suspendido". Endpoints en Auth-User
 * (/api/v1/admin/users); la suspensión sigue el ADR-002 de Auth-User.
 *
 * Desde el listado: "_suspender" completa el formulario de suspensión con el email de la cuenta, y
 * "_reactivar" pide confirmación y la reactiva ahí mismo.
 */
export function UsersSection() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<AccountStateFilter>('all');
  // Cada pedido de "_suspender" lleva un número nuevo, así el formulario se completa aunque sea la misma cuenta
  const [suspendPrefill, setSuspendPrefill] = useState<{ user: string; key: number } | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<PlatformAccount | null>(null);
  const reactivate = useReactivateAccount();

  const confirmReactivate = async () => {
    if (!reactivateTarget) return;
    try {
      await reactivate.mutateAsync(reactivateTarget.userId);
    } catch {
      // El error queda en reactivate.error y se muestra abajo de la tabla
    } finally {
      setReactivateTarget(null);
    }
  };

  return (
    <>
      <Cell title="Usuarios de la plataforma" feature="users.list" wide>
        <div className={styles.filters}>
          <UnderlineInput
            label="buscar"
            type="search"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="email, @usuario o nombre"
          />
          <Choice label="Estado de la cuenta" options={ACCOUNT_STATE_FILTER_OPTIONS} value={state} onChange={setState} />
        </div>

        <AccountsTable
          search={search}
          state={state}
          renderActions={(account) => (
            <span className={styles.links}>
              {account.isSuspended ? (
                <ActionLink
                  onPress={() => {
                    reactivate.reset();
                    setReactivateTarget(account);
                  }}
                >
                  reactivar
                </ActionLink>
              ) : (
                <ActionLink onPress={() => setSuspendPrefill({ user: account.email, key: Date.now() })}>suspender</ActionLink>
              )}
            </span>
          )}
        />

        {reactivate.isError && (
          <p role="alert" className={styles.statusError}>
            {suspensionErrorMessage(reactivate.error, 'reactivate')}
          </p>
        )}
        {reactivate.isSuccess && reactivate.data && (
          <p role="status" className={styles.success}>
            {platformAccountLabel(reactivate.data)} volvió a estar activa.
          </p>
        )}
      </Cell>

      <SuspendAccountCell prefill={suspendPrefill} />
      <ReactivateAccountCell />

      {reactivateTarget && (
        <DialogPortal>
          <ConfirmDialog
            action="reactivate-user"
            targetName={platformAccountLabel(reactivateTarget)}
            onConfirm={confirmReactivate}
            onCancel={() => setReactivateTarget(null)}
          />
        </DialogPortal>
      )}
    </>
  );
}
