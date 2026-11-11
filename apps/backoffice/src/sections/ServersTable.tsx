import { useState, type ReactNode } from 'react';
import { ActionLink, BlockButton, Skeleton, SquareAvatar } from '@web/ui';
import {
  isForbidden,
  isUnauthorized,
  serverSuspensionErrorMessage,
  useAdminServers,
  type AdminServer,
  type ServerStateFilter,
} from '@discordia/core';
import { DataTable, type Column } from '../layout/blocks';
import { SEARCH_DEBOUNCE_MS, useDebouncedValue } from '../layout/useDebouncedValue';
import { StateTag } from './StateTag';
import { formatDate } from './types';
import styles from './sections.module.css';

export const SERVERS_PAGE_SIZE = 25;

/**
 * Tabla de "Ver listado de servidores de la plataforma": nombre, id, miembros, fecha de creación y estado, con
 * búsqueda por nombre (o id) y filtro de estado, paginada. El id se muestra porque el nombre no es único: es lo que
 * usa "Suspender servidor". Carga, error (con reintentar, salvo de permisos), vacío y búsqueda en curso, explícitos.
 */
export function ServersTable({
  search,
  state,
  renderActions,
}: {
  search: string;
  state: ServerStateFilter;
  renderActions: (server: AdminServer) => ReactNode;
}) {
  const query = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  // La página vale para una búsqueda y un filtro: si cambian, se vuelve a la primera
  const filterKey = `${state}\u0000${query}`;
  const [pager, setPager] = useState({ filterKey, page: 1 });
  const page = pager.filterKey === filterKey ? pager.page : 1;
  const setPage = (next: number) => setPager({ filterKey, page: next });

  const servers = useAdminServers({ query, state, page, pageSize: SERVERS_PAGE_SIZE });
  const { data, error, isPending, isError, isFetching, isPlaceholderData, refetch } = servers;
  const authError = isError && (isForbidden(error) || isUnauthorized(error));
  const filtered = query !== '' || state !== 'all';
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const columns: Column<AdminServer>[] = [
    {
      key: 'name',
      label: 'servidor',
      render: (s) => (
        <span className={styles.links}>
          <SquareAvatar user={{ displayName: s.name, username: s.name, avatar: s.iconUrl }} size={24} />
          <span>
            <strong>{s.name}</strong>
            <br />
            <code className={styles.muted}>{s.id}</code>
          </span>
        </span>
      ),
    },
    { key: 'members', label: 'miembros', render: (s) => s.memberCount },
    { key: 'createdAt', label: 'creado', render: (s) => formatDate(s.createdAt) },
    { key: 'state', label: 'estado', render: (s) => <StateTag state={s.isSuspended ? 'suspended' : 'active'} /> },
    { key: 'actions', label: 'acciones', render: renderActions },
  ];

  if (isPending) return <Skeleton lines={4} label="Cargando el listado de servidores" />;

  if (isError && !data) {
    return (
      <div className={styles.form}>
        <p role="alert" className={styles.statusError}>
          {serverSuspensionErrorMessage(error, 'list-servers')}
        </p>
        {!authError && (
          <BlockButton loading={isFetching} onPress={() => void refetch()}>
            Reintentar
          </BlockButton>
        )}
      </div>
    );
  }

  return (
    <>
      <DataTable
        caption="Servidores de la plataforma"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(s) => s.id}
        empty={
          filtered
            ? { title: 'ningún servidor coincide', hint: 'probá con otra parte del nombre, con el id completo o con otro estado' }
            : { title: 'todavía no hay servidores', hint: 'los servidores aparecen acá cuando alguien crea uno' }
        }
      />

      <div className={styles.pager}>
        <span role="status" aria-live="polite" className={styles.muted}>
          {isFetching && isPlaceholderData
            ? 'buscando…'
            : data && `${data.total} ${data.total === 1 ? 'servidor' : 'servidores'} · página ${data.page} de ${pages}`}
        </span>
        {pages > 1 && (
          <span className={styles.links}>
            <ActionLink onPress={() => setPage(page - 1)} disabled={page <= 1 || isFetching}>
              anterior
            </ActionLink>
            <ActionLink onPress={() => setPage(page + 1)} disabled={page >= pages || isFetching}>
              siguiente
            </ActionLink>
          </span>
        )}
      </div>

      {isError && data && (
        <p role="alert" className={styles.statusError}>
          {serverSuspensionErrorMessage(error, 'list-servers')}
        </p>
      )}
    </>
  );
}
