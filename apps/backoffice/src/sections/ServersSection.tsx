import { useState } from 'react';
import { ActionLink, Choice, ConfirmDialog, UnderlineInput } from '@web/ui';
import {
  SERVER_STATE_FILTER_OPTIONS,
  serverSuspensionErrorMessage,
  useLiftServerSuspension,
  type AdminServer,
  type ServerStateFilter,
} from '@discordia/core';
import { Cell } from '../layout/Cell';
import { DialogPortal } from '../layout/DialogPortal';
import { DeleteServerCell } from './DeleteServerCell';
import { ServersTable } from './ServersTable';
import { SuspendServerCell } from './SuspendServerCell';
import { SuspendedServersCell } from './SuspendedServersCell';
import styles from './sections.module.css';

/**
 * SERVIDORES: "Ver listado de servidores de la plataforma" (nombre, id, miembros y fecha de creación, con
 * búsqueda por nombre o id y filtro de estado), "Suspender servidor completo" (y levantar la suspensión) y
 * "Eliminar servidor desde el backoffice". Endpoints en Server-Roles (/api/v1/admin/servers).
 *
 * Suspender y eliminar van por id porque el nombre no es único (ADR-002 de Server-Roles). Desde el listado:
 * "_suspender" o "_eliminar" completan el formulario correspondiente con el id del servidor, y
 * "_levantar suspensión" pide confirmación y la levanta ahí mismo.
 */
export function ServersSection() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<ServerStateFilter>('all');
  // Cada pedido de "_suspender" o "_eliminar" lleva un número nuevo, así el formulario se completa aunque sea el mismo servidor
  const [suspendPrefill, setSuspendPrefill] = useState<{ serverId: string; name: string; key: number } | null>(null);
  const [deletePrefill, setDeletePrefill] = useState<{ serverId: string; name: string; key: number } | null>(null);
  const [liftTarget, setLiftTarget] = useState<AdminServer | null>(null);
  const lift = useLiftServerSuspension();

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
              <ActionLink
                onPress={() => setDeletePrefill({ serverId: server.id, name: server.name, key: Date.now() })}
                aria-label={`Eliminar ${server.name}`}
              >
                eliminar
              </ActionLink>
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
      <DeleteServerCell prefill={deletePrefill} />

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
