import { useState } from 'react';
import { BlockButton, Choice, EmptyState, UnderlineInput } from '@web/ui';
import { Cell, Note } from '../layout/Cell';
import { CheckList, DataTable, TextArea, type Column } from '../layout/blocks';
import styles from './sections.module.css';

type ServiceId = 'gateway' | 'auth-user' | 'server-roles' | 'chat' | 'voice' | 'notification-audit' | 'payments';

type IncidentKind = 'degraded' | 'maintenance';

/** Los servicios que exponen /livez y /readyz (Requisitos No Funcionales): los afectados de un incidente. */
const SERVICES: { value: ServiceId; label: string }[] = [
  { value: 'gateway', label: 'API Gateway' },
  { value: 'auth-user', label: 'Usuarios y autenticación' },
  { value: 'server-roles', label: 'Servidores, roles y moderación' },
  { value: 'chat', label: 'Mensajería' },
  { value: 'voice', label: 'Voz' },
  { value: 'notification-audit', label: 'Notificaciones, auditoría y métricas' },
  { value: 'payments', label: 'Pagos y monetización' },
];

const KIND_OPTIONS: { value: IncidentKind; label: string }[] = [
  { value: 'degraded', label: 'degradación' },
  { value: 'maintenance', label: 'mantenimiento' },
];

const SERVICE_COLUMNS: Column<(typeof SERVICES)[number]>[] = [
  { key: 'name', label: 'servicio', render: (s) => <span className={styles.serviceName}>{s.label}</span> },
  { key: 'state', label: 'estado', render: () => <span className={styles.muted}>—</span> },
];

/**
 * ESTADO: "Estado de la plataforma e incidentes" (épica 11). El staff publica un incidente (título,
 * descripción y servicios afectados) y los usuarios ven un aviso en la app hasta que se resuelve. Se valora
 * que el backoffice sugiera crear uno cuando un health check (/readyz) informa degradación.
 */
export function StatusSection() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<IncidentKind>('degraded');
  const [affected, setAffected] = useState<ServiceId[]>([]);

  return (
    <>
      <Cell title="Estado de los servicios" feature="status.incidents" wide>
        <DataTable
          caption="Estado de los servicios"
          columns={SERVICE_COLUMNS}
          rows={SERVICES}
          rowKey={(s) => s.value}
          empty={{ title: 'sin servicios' }}
        />
        <Note>Cuando un servicio informe degradación en su health check, acá se va a sugerir publicar un incidente.</Note>
      </Cell>

      <Cell title="Publicar incidente" feature="status.incidents">
        <UnderlineInput label="título" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="por ejemplo, demoras en la voz" />
        <TextArea label="descripción" value={description} maxLength={1000} onChange={setDescription} placeholder="qué pasa y qué pueden hacer los usuarios" />
        <Choice label="Tipo" options={KIND_OPTIONS} value={kind} onChange={setKind} />
        <CheckList label="servicios afectados" options={SERVICES} value={affected} onChange={setAffected} />
        <BlockButton>Publicar</BlockButton>
        <Note>Los usuarios ven el aviso en la app mientras el incidente esté activo.</Note>
      </Cell>

      <Cell title="Incidentes activos" feature="status.incidents">
        <EmptyState title="no hay incidentes activos" hint="al resolverlos, el aviso desaparece para todos" />
      </Cell>
    </>
  );
}
