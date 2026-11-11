import { useState } from 'react';
import { ActionLink, BlockButton, ConfirmDialog, EmptyState, Skeleton } from '@web/ui';
import {
  isForbidden,
  isUnauthorized,
  serverSuspensionErrorMessage,
  useLiftServerSuspension,
  useSuspendedServers,
  type AdminServer,
} from '@discordia/core';
import { Cell, Note, Row } from '../layout/Cell';
import { DialogPortal } from '../layout/DialogPortal';
import { formatDate } from './types';
import styles from './sections.module.css';

/**
 * Servidores suspendidos, con cuándo y por qué, y "_levantar suspensión" (con confirmación). CA 2: al levantarla
 * los miembros recuperan el acceso normal. Cargando, vacío y error se muestran explícitos.
 */
export function SuspendedServersCell() {
  const query = useSuspendedServers();
  const mutation = useLiftServerSuspension();
  const [target, setTarget] = useState<AdminServer | null>(null);
  const [lifted, setLifted] = useState<string | null>(null);

  const confirm = async () => {
    if (!target) return;
    try {
      const server = await mutation.mutateAsync(target.id);
      setLifted(server.name);
    } catch {
      // El error queda en mutation.error y se muestra abajo
    } finally {
      setTarget(null);
    }
  };

  // Sin permiso o sin sesión, reintentar no cambia nada
  const authError = query.isError && (isForbidden(query.error) || isUnauthorized(query.error));

  return (
    <Cell title="Servidores suspendidos" feature="servers.suspend">
      {query.isPending && <Skeleton lines={3} label="Cargando los servidores suspendidos" />}

      {query.isError && (
        <div className={styles.form}>
          <p role="alert" className={styles.statusError}>
            {serverSuspensionErrorMessage(query.error, 'list')}
          </p>
          {!authError && (
            <BlockButton loading={query.isFetching} onPress={() => void query.refetch()}>
              Reintentar
            </BlockButton>
          )}
        </div>
      )}

      {query.data && query.data.length === 0 && (
        <EmptyState title="no hay servidores suspendidos" hint="los servidores suspendidos van a aparecer acá" />
      )}

      {query.data && query.data.length > 0 && (
        <ul className={styles.accountList} aria-label="Servidores suspendidos">
          {query.data.map((server) => (
            <li key={server.id}>
              <Row
                title={server.name}
                description={[
                  server.id,
                  `${server.memberCount} ${server.memberCount === 1 ? 'miembro' : 'miembros'}`,
                  server.suspendedAt ? `suspendido el ${formatDate(server.suspendedAt)}` : 'suspendido',
                  server.suspensionReason,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              >
                <ActionLink
                  onPress={() => {
                    setLifted(null);
                    mutation.reset();
                    setTarget(server);
                  }}
                  disabled={mutation.isPending}
                  aria-label={`Levantar la suspensión de ${server.name}`}
                >
                  levantar suspensión
                </ActionLink>
              </Row>
            </li>
          ))}
        </ul>
      )}

      {mutation.isError && (
        <p role="alert" className={styles.statusError}>
          {serverSuspensionErrorMessage(mutation.error, 'lift')}
        </p>
      )}
      {lifted && (
        <p role="status" className={styles.success}>
          {lifted} volvió a estar activo.
        </p>
      )}
      <Note>Al levantarla, los miembros vuelven a entrar normalmente y ven todo el contenido que tenía.</Note>

      {target && (
        <DialogPortal>
          <ConfirmDialog
            action="lift-server-suspension"
            targetName={target.name}
            onConfirm={confirm}
            onCancel={() => setTarget(null)}
          />
        </DialogPortal>
      )}
    </Cell>
  );
}
