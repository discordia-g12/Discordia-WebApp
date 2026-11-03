import { useState } from 'react';
import { BlockButton, Choice, EmptyState, UnderlineInput } from '@web/ui';
import type { PlatformServiceId } from '@discordia/core';
import { Cell, Note } from '../layout/Cell';
import { CheckList, TextArea } from '../layout/blocks';
import { grafanaLinks } from './grafana';
import { PlatformStatusPanel } from './PlatformStatusPanel';

type IncidentKind = 'degraded' | 'maintenance';

/**
 * Los servicios que exponen /livez y /readyz (Requisitos No Funcionales): los afectados de un incidente.
 * Con los mismos ids que GET /api/v1/admin/status.
 */
const SERVICES: { value: PlatformServiceId; label: string }[] = [
  { value: 'gateway', label: 'API Gateway' },
  { value: 'auth', label: 'Usuarios y autenticación' },
  { value: 'server-roles', label: 'Servidores, roles y moderación' },
  { value: 'chat', label: 'Mensajería' },
  { value: 'voice', label: 'Voz' },
  { value: 'notification', label: 'Notificaciones, auditoría y métricas' },
  { value: 'payments', label: 'Pagos y monetización' },
];

const KIND_OPTIONS: { value: IncidentKind; label: string }[] = [
  { value: 'degraded', label: 'degradación' },
  { value: 'maintenance', label: 'mantenimiento' },
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
  const [affected, setAffected] = useState<PlatformServiceId[]>([]);

  return (
    <>
      <PlatformStatusPanel grafanaUrl={grafanaLinks().home} />

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
