import { useEffect, useState, type ReactNode } from 'react';
import { ActionLink, BlockButton, Skeleton, SquareAvatar } from '@web/ui';
import {
  isForbidden,
  isUnauthorized,
  suspensionErrorMessage,
  usePlatformAccounts,
  type AccountStateFilter,
  type PlatformAccount,
} from '@discordia/core';
import { DataTable, type Column } from '../layout/blocks';
import { StateTag } from './StateTag';
import { formatDate } from './types';
import styles from './sections.module.css';

export const ACCOUNTS_PAGE_SIZE = 25;
/** Espera después de la última tecla antes de buscar: un pedido por búsqueda, no por letra. */
export const SEARCH_DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Tabla del listado de usuarios ("Ver listado de usuarios con filtros"): busca en el servidor por email, @usuario
 * o nombre (CA 1) y filtra por estado (CA 2), paginada. Muestra explícitos la carga, el error (con reintentar,
 * salvo que sea de permisos), el vacío y la búsqueda en curso.
 */
export function AccountsTable({
  search,
  state,
  renderActions,
}: {
  search: string;
  state: AccountStateFilter;
  renderActions: (account: PlatformAccount) => ReactNode;
}) {
  const query = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  // La página vale para una búsqueda y un filtro: si cambian, se vuelve a la primera (sin pedir antes la
  // página vieja de la búsqueda nueva)
  const filterKey = `${state}\u0000${query}`;
  const [pager, setPager] = useState({ filterKey, page: 1 });
  const page = pager.filterKey === filterKey ? pager.page : 1;
  const setPage = (next: number) => setPager({ filterKey, page: next });

  const accounts = usePlatformAccounts({ query, state, page, pageSize: ACCOUNTS_PAGE_SIZE });
  const { data, error, isPending, isError, isFetching, isPlaceholderData, refetch } = accounts;
  const authError = isError && (isForbidden(error) || isUnauthorized(error));
  const filtered = query !== '' || state !== 'all';
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const columns: Column<PlatformAccount>[] = [
    {
      key: 'user',
      label: 'usuario',
      render: (a) => (
        <span className={styles.links}>
          <SquareAvatar
            user={{ displayName: a.displayName || a.username || a.email, username: a.username || a.email }}
            size={24}
          />
          {a.username ? (
            <span>
              <strong>{a.displayName || a.username}</strong> <span className={styles.muted}>@{a.username}</span>
            </span>
          ) : (
            <span className={styles.muted}>sin perfil todavía</span>
          )}
        </span>
      ),
    },
    { key: 'email', label: 'email', render: (a) => a.email },
    { key: 'createdAt', label: 'registro', render: (a) => formatDate(a.createdAt) },
    { key: 'state', label: 'estado', render: (a) => <StateTag state={a.isSuspended ? 'suspended' : 'active'} /> },
    { key: 'actions', label: 'acciones', render: renderActions },
  ];

  if (isPending) return <Skeleton lines={4} label="Cargando el listado de usuarios" />;

  if (isError && !data) {
    return (
      <div className={styles.form}>
        <p role="alert" className={styles.statusError}>
          {suspensionErrorMessage(error, 'list-accounts')}
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
        caption="Usuarios de la plataforma"
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(a) => a.userId}
        empty={
          filtered
            ? { title: 'ningún usuario coincide', hint: 'probá con otra parte del email, el @usuario o el nombre, o con otro estado' }
            : { title: 'todavía no hay cuentas', hint: 'las cuentas aparecen acá cuando alguien se registra' }
        }
      />

      <div className={styles.pager}>
        <span role="status" aria-live="polite" className={styles.muted}>
          {isFetching && isPlaceholderData
            ? 'buscando…'
            : data && `${data.total} ${data.total === 1 ? 'cuenta' : 'cuentas'} · página ${data.page} de ${pages}`}
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
          {suspensionErrorMessage(error, 'list-accounts')}
        </p>
      )}
    </>
  );
}
