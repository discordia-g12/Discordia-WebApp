import { useState } from 'react';
import { ActionLink, BlockButton, Choice, EmptyState, UnderlineInput } from '@web/ui';
import { Cell, Note } from '../layout/Cell';
import { FieldList, StatGrid } from '../layout/blocks';
import styles from './sections.module.css';

type CaseTarget = 'user' | 'server';

const TARGET_OPTIONS: { value: CaseTarget; label: string }[] = [
  { value: 'user', label: 'usuario' },
  { value: 'server', label: 'servidor' },
];

/**
 * EXPEDIENTES: "Ver expediente de investigación de usuario o servidor". Junta datos de varios servicios
 * (cuenta en Auth-User; servidores, baneos y silencios en Server-Roles; actividad en Chat; reportes y
 * auditoría en Notification-Audit). La consigna valora poder suspender o eliminar desde el expediente.
 */
export function CasesSection() {
  const [target, setTarget] = useState<CaseTarget>('user');
  const [query, setQuery] = useState('');

  return (
    <>
      <Cell title="Buscar expediente" feature={target === 'user' ? 'cases.user' : 'cases.server'} wide>
        <Choice label="Tipo de expediente" options={TARGET_OPTIONS} value={target} onChange={setTarget} />
        <UnderlineInput
          label={target === 'user' ? 'usuario' : 'servidor'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={target === 'user' ? 'email, @usuario o id' : 'nombre o id del servidor'}
        />
        <BlockButton>Abrir expediente</BlockButton>
      </Cell>

      {target === 'user' ? (
        <>
          <Cell title="Expediente de usuario" feature="cases.user">
            <FieldList
              fields={[
                { label: 'estado de la cuenta' },
                { label: 'fecha de registro' },
                { label: 'servidores a los que pertenece' },
              ]}
            />
            <StatGrid stats={[{ label: 'reportes recibidos' }, { label: 'acciones de moderación' }]} />
            <span className={styles.links}>
              <ActionLink>suspender</ActionLink>
              <ActionLink>reactivar</ActionLink>
            </span>
          </Cell>
          <Cell title="Historial" feature="cases.user">
            <EmptyState title="sin actividad para mostrar" hint="actividad reciente, reportes y acciones de moderación, en orden" />
            <Note>Cada suspensión o reactivación del staff queda acá, con quién la hizo y el motivo.</Note>
          </Cell>
        </>
      ) : (
        <>
          <Cell title="Expediente de servidor" feature="cases.server">
            <FieldList fields={[{ label: 'estado' }, { label: 'fecha de creación' }, { label: 'cantidad de miembros' }]} />
            <StatGrid stats={[{ label: 'reportes' }, { label: 'acciones de moderación' }]} />
            <span className={styles.links}>
              <ActionLink>suspender</ActionLink>
              <ActionLink>eliminar</ActionLink>
            </span>
          </Cell>
          <Cell title="Historial" feature="cases.server">
            <EmptyState title="sin actividad para mostrar" hint="actividad de mensajería reciente, reportes y moderación del servidor" />
          </Cell>
        </>
      )}
    </>
  );
}
