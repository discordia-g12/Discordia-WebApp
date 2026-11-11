import { useState } from 'react';
import { ActionLink, BlockButton, SquareAvatar, UnderlineInput } from '@web/ui';
import { Cell, Note } from '../layout/Cell';
import { DataTable, type Column } from '../layout/blocks';
import { StateTag } from './StateTag';
import { SuspendServerCell } from './SuspendServerCell';
import { SuspendedServersCell } from './SuspendedServersCell';
import { formatDate, type PlatformServerRow } from './types';
import styles from './sections.module.css';

const COLUMNS: Column<PlatformServerRow>[] = [
  {
    key: 'name',
    label: 'servidor',
    render: (s) => (
      <span className={styles.links}>
        <SquareAvatar user={{ displayName: s.name, username: s.name }} size={24} />
        <strong>{s.name}</strong>
      </span>
    ),
  },
  { key: 'members', label: 'miembros', render: (s) => s.members },
  { key: 'createdAt', label: 'creado', render: (s) => formatDate(s.createdAt) },
  { key: 'state', label: 'estado', render: (s) => <StateTag state={s.state} /> },
  {
    key: 'actions',
    label: 'acciones',
    render: (s) => (
      <span className={styles.links}>
        <ActionLink>{s.state === 'active' ? 'suspender' : 'levantar suspensión'}</ActionLink>
        <ActionLink>eliminar</ActionLink>
        <ActionLink>expediente</ActionLink>
      </span>
    ),
  },
];

/**
 * SERVIDORES: "Ver listado de servidores de la plataforma" (nombre, miembros y fecha de creación, con
 * búsqueda por nombre), "Suspender servidor completo" (y levantar la suspensión) y "Eliminar servidor desde
 * el backoffice". Endpoints en Server-Roles.
 *
 * Suspender va por id (el nombre no es único) y sigue el ADR-002 de Server-Roles; las acciones del listado se
 * conectan cuando exista el endpoint del listado.
 */
export function ServersSection() {
  const [search, setSearch] = useState('');
  const [deleteName, setDeleteName] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const servers: PlatformServerRow[] = [];

  return (
    <>
      <Cell title="Servidores de la plataforma" feature="servers.list" wide>
        <UnderlineInput label="buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="nombre del servidor" />
        <DataTable
          caption="Servidores de la plataforma"
          columns={COLUMNS}
          rows={servers}
          rowKey={(s) => s.id}
          empty={{ title: 'sin servidores para mostrar', hint: 'el listado aparece cuando se conecte con la plataforma' }}
        />
      </Cell>

      <SuspendServerCell />
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
    </>
  );
}
