import { useState } from 'react';
import { ActionLink, Choice, SquareAvatar, UnderlineInput } from '@web/ui';
import { Cell } from '../layout/Cell';
import { DataTable, type Column } from '../layout/blocks';
import { ReactivateAccountCell } from './ReactivateAccountCell';
import { StateTag } from './StateTag';
import { SuspendAccountCell } from './SuspendAccountCell';
import { ACCOUNT_STATE_OPTIONS, formatDate, type AccountStateFilter, type PlatformUserRow } from './types';
import styles from './sections.module.css';

const COLUMNS: Column<PlatformUserRow>[] = [
  {
    key: 'user',
    label: 'usuario',
    render: (u) => (
      <span className={styles.links}>
        <SquareAvatar user={u} size={24} />
        <span>
          <strong>{u.displayName}</strong> <span className={styles.muted}>@{u.username}</span>
        </span>
      </span>
    ),
  },
  { key: 'email', label: 'email', render: (u) => u.email },
  { key: 'createdAt', label: 'registro', render: (u) => formatDate(u.createdAt) },
  { key: 'state', label: 'estado', render: (u) => <StateTag state={u.state} /> },
  {
    key: 'actions',
    label: 'acciones',
    render: (u) => (
      <span className={styles.links}>
        <ActionLink>{u.state === 'active' ? 'suspender' : 'reactivar'}</ActionLink>
        <ActionLink>expediente</ActionLink>
      </span>
    ),
  },
];

/**
 * USUARIOS: "Ver listado de usuarios con filtros" (email o nombre, activo o suspendido), "Suspender usuario
 * a nivel plataforma" y "Reactivar usuario suspendido". Endpoints en Auth-User; la suspensión sigue el
 * ADR-002 de Auth-User (bloqueo en Auth0, lista de bloqueados en Kong y evento user.suspended).
 */
export function UsersSection() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<AccountStateFilter>('all');
  const users: PlatformUserRow[] = [];

  return (
    <>
      <Cell title="Usuarios de la plataforma" feature="users.list" wide>
        <div className={styles.filters}>
          <UnderlineInput label="buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="email o nombre" />
          <Choice label="Estado de la cuenta" options={ACCOUNT_STATE_OPTIONS} value={state} onChange={setState} />
        </div>
        <DataTable
          caption="Usuarios de la plataforma"
          columns={COLUMNS}
          rows={users}
          rowKey={(u) => u.id}
          empty={{ title: 'sin usuarios para mostrar', hint: 'el listado aparece cuando se conecte con la plataforma' }}
        />
      </Cell>

      <SuspendAccountCell />
      <ReactivateAccountCell />
    </>
  );
}
