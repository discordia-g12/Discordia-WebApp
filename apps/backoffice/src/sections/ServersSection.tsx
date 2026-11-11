import { useState } from 'react';
import { ActionLink, BlockButton, Choice, ConfirmDialog, UnderlineInput } from '@web/ui';
import {
  SERVER_STATE_FILTER_OPTIONS,
  serverSuspensionErrorMessage,
  useLiftServerSuspension,
  type AdminServer,
  type ServerStateFilter,
} from '@discordia/core';
import { Cell, Note } from '../layout/Cell';
import { DialogPortal } from '../layout/DialogPortal';
import { ServersTable } from './ServersTable';
import { SuspendServerCell } from './SuspendServerCell';
import { SuspendedServersCell } from './SuspendedServersCell';
import styles from './sections.module.css';

/**
 * SERVIDORES: "Ver listado de servidores de la plataforma" (nombre, id, miembros y fecha de creación, con
 * búsqueda por nombre o id y filtro de estado), "Suspender servidor completo" (y levantar la suspensión) y
 * "Eliminar servidor desde el backoffice". Endpoints en Server-Roles (/api/v1/admin/servers).
 *
 * Suspender va por id porque el nombre no es único (ADR-002 de Server-Roles). Desde el listado: "_suspender"
 * completa el formulario con el id del servidor, y "_levantar suspensión" pide confirmación y la levanta ahí mismo.
 */
export function ServersSection() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<ServerStateFilter>('all');
  // Cada pedido de "_suspender" lleva un número nuevo, así el formulario se completa aunque sea el mismo servidor
  const [suspendPrefill, setSuspendPrefill] = useState<{ serverId: string; name: string; key: number } | null>(null);
  const [liftTarget, setLiftTarget] = useState<AdminServer | null>(null);
  const lift = useLiftServerSuspension();
  const [deleteName, setDeleteName] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  const confirmLift = async () => {
    if (!liftTarget) return;
    try {
      await lift.mutateAsync(liftTarget.id);
    } catch {
      // El error queda en lift.error y se muestra abajo de la tabla
    } finally {
      setLiftTarget(null);
    }
  };

  return (
    <>
      <Cell title="Servidores de la plataforma" feature="servers.list" wide>
        <div className={styles.filters}>
          <UnderlineInput
            label="buscar"
            type="search"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="nombre o id del servidor"
          />
          <Choice label="Estado del servidor" options={SERVER_STATE_FILTER_OPTIONS} value={state} onChange={setState} />
        </div>

        <ServersTable
          search={search}
          state={state}
          renderActions={(server) => (
            <span className={styles.links}>
              {server.isSuspended ? (
                <ActionLink
                  onPress={() => {
                    lift.reset();
                    setLiftTarget(server);
                  }}
                  aria-label={`Levantar la suspensión de ${server.name}`}
                >
                  levantar suspensión
                </ActionLink>
              ) : (
                <ActionLink
                  onPress={() => setSuspendPrefill({ serverId: server.id, name: server.name, key: Date.now() })}
                  aria-label={`Suspender ${server.name}`}
                >
                  suspender
                </ActionLink>
              )}
            </span>
          )}
        />

        {lift.isError && (
          <p role="alert" className={styles.statusError}>
            {serverSuspensionErrorMessage(lift.error, 'lift')}
          </p>
        )}
        {lift.isSuccess && lift.data && (
          <p role="status" className={styles.success}>
            {lift.data.name} volvió a estar activo.
          </p>
        )}
      </Cell>

      <SuspendServerCell prefill={suspendPrefill} />
      <SuspendedServersCell />

      <Cell title="Eliminar servidor" feature="servers.delete">
        <UnderlineInput
          label="nombre del servidor"
          value={deleteName}
          onChange={(e) => setDeleteName(e.target.value)}
          hint="escribilo completo para confirmar"
        />
        <UnderlineInput label="motivo" value={deleteReason} maxLength={512} onChange={(e) => setDeleteReason(e.target.value)} />
        <BlockButton tone="danger">Eliminar servidor</BlockButton>
        <Note>Se borran para siempre sus canales, mensajes y roles. No se puede deshacer.</Note>
      </Cell>

      {liftTarget && (
        <DialogPortal>
          <ConfirmDialog
            action="lift-server-suspension"
            targetName={liftTarget.name}
            onConfirm={confirmLift}
            onCancel={() => setLiftTarget(null)}
          />
        </DialogPortal>
      )}
    </>
  );
}
