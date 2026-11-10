import { useEffect, useRef, useState } from 'react';
import { ActionLink, BlockButton, Choice, ConfirmDialog, EmptyState, Skeleton, UnderlineInput } from '@web/ui';
import {
  formatTimeAgo,
  INCIDENT_DESCRIPTION_MAX,
  INCIDENT_KIND_LABEL,
  INCIDENT_TITLE_MAX,
  INCIDENT_TITLE_MIN,
  incidentErrorMessage,
  incidentSuggestions,
  isForbidden,
  isUnauthorized,
  PLATFORM_SERVICES,
  platformServiceName,
  suggestedIncidentTitle,
  useActiveIncidents,
  useCreateIncident,
  useIncidentHistory,
  usePlatformStatus,
  useResolveIncident,
  type AdminIncident,
  type IncidentKind,
  type PlatformServiceId,
} from '@discordia/core';
import { Cell, Note } from '../layout/Cell';
import { DialogPortal } from '../layout/DialogPortal';
import { CheckList, TextArea } from '../layout/blocks';
import styles from './sections.module.css';

const KIND_OPTIONS: { value: IncidentKind; label: string }[] = [
  { value: 'degraded', label: 'degradación' },
  { value: 'maintenance', label: 'mantenimiento' },
];

const SERVICE_OPTIONS = PLATFORM_SERVICES.map((s) => ({ value: s.id, label: s.name }));

/** Lo que manda una sugerencia al formulario. La key cambia en cada pedido (como el prefill de suspender). */
export interface IncidentPrefill {
  title: string;
  kind: IncidentKind;
  affectedServices: PlatformServiceId[];
  key: number;
}

function servicesText(ids: readonly string[]): string {
  return ids.map(platformServiceName).join(', ');
}

/**
 * Plus de la historia 74: un servicio que el health check ve degradado y que ningún incidente activo cubre se
 * sugiere como incidente. "_publicar incidente" completa el formulario; "_descartar" la oculta hasta que el
 * servicio se recupere y vuelva a caer (otra degradación, otra key).
 */
export function IncidentSuggestionsCell({ onSuggest }: { onSuggest: (prefill: Omit<IncidentPrefill, 'key'>) => void }) {
  const status = usePlatformStatus();
  const active = useActiveIncidents();
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const suggestions = incidentSuggestions(status.data, active.data, dismissed);

  if (suggestions.length === 0) return null;

  return (
    <Cell title="Sugerencias" feature="status.incidents">
      <ul className={styles.accountList} aria-label="Incidentes sugeridos">
        {suggestions.map((s) => (
          <li key={s.key} className={styles.incident}>
            <p className={styles.incidentTitle}>{s.serviceName} está degradado</p>
            <p className={styles.muted}>
              según su health check, desde {formatTimeAgo(s.since)}. No hay ningún incidente activo que lo cubra.
            </p>
            <div className={styles.links}>
              <ActionLink
                onPress={() =>
                  onSuggest({
                    title: suggestedIncidentTitle(s.serviceName),
                    kind: 'degraded',
                    affectedServices: [s.serviceId as PlatformServiceId],
                  })
                }
              >
                publicar incidente
              </ActionLink>
              <ActionLink onPress={() => setDismissed((prev) => new Set(prev).add(s.key))}>descartar</ActionLink>
            </div>
          </li>
        ))}
      </ul>
    </Cell>
  );
}

/**
 * CA 1: título, descripción, tipo y servicios afectados (los que exponen health checks). Pide confirmación y,
 * al publicarse, el aviso llega a la app en menos de un minuto.
 */
export function PublishIncidentCell({ prefill = null }: { prefill?: IncidentPrefill | null }) {
  // Una sugerencia nueva vuelve a montar la celda (key = prefill.key en StatusSection): arranca con sus datos.
  const [title, setTitle] = useState(prefill?.title ?? '');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<IncidentKind>(prefill?.kind ?? 'degraded');
  const [affected, setAffected] = useState<PlatformServiceId[]>(prefill?.affectedServices ?? []);
  const [confirming, setConfirming] = useState(false);
  const [published, setPublished] = useState<AdminIncident | null>(null);
  const mutation = useCreateIncident();
  const titleRef = useRef<HTMLInputElement>(null);
  const fromSuggestion = prefill !== null;

  useEffect(() => {
    if (!fromSuggestion) return;
    titleRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    titleRef.current?.focus();
  }, [fromSuggestion]);

  const titleOk = title.trim().length >= INCIDENT_TITLE_MIN;
  const canSubmit = titleOk && description.trim() !== '' && affected.length > 0 && !mutation.isPending;

  const confirm = async () => {
    try {
      const incident = await mutation.mutateAsync({ title, description, kind, affectedServices: affected });
      setPublished(incident);
      setTitle('');
      setDescription('');
      setKind('degraded');
      setAffected([]);
    } catch {
      // El error queda en mutation.error y se muestra abajo
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Cell title="Publicar incidente" feature="status.incidents">
      <form
        className={styles.form}
        aria-label="Publicar incidente"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setPublished(null);
          mutation.reset();
          setConfirming(true);
        }}
      >
        <UnderlineInput
          ref={titleRef}
          label="título"
          required
          value={title}
          maxLength={INCIDENT_TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="por ejemplo, demoras en la voz"
          hint={`de ${INCIDENT_TITLE_MIN} a ${INCIDENT_TITLE_MAX} caracteres`}
        />
        <TextArea
          label="descripción"
          value={description}
          maxLength={INCIDENT_DESCRIPTION_MAX}
          onChange={setDescription}
          placeholder="qué pasa y qué pueden hacer los usuarios"
        />
        <Choice label="Tipo" options={KIND_OPTIONS} value={kind} onChange={setKind} />
        <CheckList label="servicios afectados" options={SERVICE_OPTIONS} value={affected} onChange={setAffected} />
        <BlockButton type="submit" loading={mutation.isPending} disabled={!canSubmit}>
          Publicar
        </BlockButton>
      </form>

      {mutation.isError && (
        <p role="alert" className={styles.statusError}>
          {incidentErrorMessage(mutation.error, 'create')}
        </p>
      )}
      {published && (
        <p role="status" className={styles.success}>
          Publicado: «{published.title}». Los usuarios lo ven en la app en menos de un minuto.
        </p>
      )}
      <Note>Los usuarios ven el aviso en la app mientras el incidente esté activo.</Note>

      {confirming && (
        <DialogPortal>
          <ConfirmDialog action="publish-incident" targetName={title.trim()} onConfirm={confirm} onCancel={() => setConfirming(false)} />
        </DialogPortal>
      )}
    </Cell>
  );
}

function IncidentItem({ incident, onResolve }: { incident: AdminIncident; onResolve?: () => void }) {
  return (
    <li className={styles.incident}>
      <p className={styles.incidentTitle}>
        <span className={`${styles.tag} ${incident.kind === 'maintenance' ? '' : styles.tagSuspended}`}>
          {INCIDENT_KIND_LABEL[incident.kind]}
        </span>{' '}
        {incident.title}
      </p>
      <p className={styles.incidentDescription}>{incident.description}</p>
      <p className={styles.muted}>
        {servicesText(incident.affectedServices)} · desde {formatTimeAgo(incident.startedAt)}
        {incident.resolvedAt && ` · resuelto ${formatTimeAgo(incident.resolvedAt)}`}
      </p>
      {incident.resolutionNote && <p className={styles.muted}>/ {incident.resolutionNote}</p>}
      {onResolve && (
        <div className={styles.links}>
          <ActionLink onPress={onResolve} aria-label={`Resolver «${incident.title}»`}>
            resolver
          </ActionLink>
        </div>
      )}
    </li>
  );
}

/** CA 2: los incidentes activos, cada uno con "_resolver" (con confirmación y nota opcional). */
export function ActiveIncidentsCell() {
  const query = useActiveIncidents();
  const mutation = useResolveIncident();
  const [target, setTarget] = useState<AdminIncident | null>(null);
  const [note, setNote] = useState('');
  const [resolved, setResolved] = useState<string | null>(null);
  const authError = query.isError && (isUnauthorized(query.error) || isForbidden(query.error));

  const confirm = async () => {
    if (!target) return;
    try {
      await mutation.mutateAsync({ id: target.id, note });
      setResolved(target.title);
      setNote('');
    } catch {
      // Se muestra abajo
    } finally {
      setTarget(null);
    }
  };

  return (
    <Cell title="Incidentes activos" feature="status.incidents">
      {query.isError && (
        <p role="alert" className={styles.statusError}>
          {incidentErrorMessage(query.error, 'list')}
          {!authError && (
            <>
              {' '}
              <ActionLink onPress={() => void query.refetch()}>reintentar</ActionLink>
            </>
          )}
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className={styles.statusError}>
          {incidentErrorMessage(mutation.error, 'resolve')}
        </p>
      )}
      {resolved && (
        <p role="status" className={styles.success}>
          Resuelto: «{resolved}». El aviso desaparece para todos en menos de un minuto.
        </p>
      )}

      {query.isPending ? (
        <Skeleton lines={3} label="Consultando los incidentes activos" />
      ) : query.data && query.data.length > 0 ? (
        <>
          <UnderlineInput
            label="nota de cierre (opcional)"
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            hint="queda en el historial y en el registro de auditoría"
          />
          <ul className={styles.accountList} aria-label="Incidentes activos">
            {query.data.map((incident) => (
              <IncidentItem
                key={incident.id}
                incident={incident}
                onResolve={() => {
                  setResolved(null);
                  mutation.reset();
                  setTarget(incident);
                }}
              />
            ))}
          </ul>
        </>
      ) : query.data ? (
        <EmptyState title="no hay incidentes activos" hint="al resolverlos, el aviso desaparece para todos" />
      ) : null}

      {target && (
        <DialogPortal>
          <ConfirmDialog action="resolve-incident" targetName={target.title} onConfirm={confirm} onCancel={() => setTarget(null)} />
        </DialogPortal>
      )}
    </Cell>
  );
}

/** Historial: los últimos incidentes resueltos, con quién y cuándo los cerró. */
export function IncidentHistoryCell() {
  const query = useIncidentHistory();
  return (
    <Cell title="Historial" feature="status.incidents">
      {query.isError ? (
        <p role="alert" className={styles.statusError}>
          {incidentErrorMessage(query.error, 'list')}
        </p>
      ) : query.isPending ? (
        <Skeleton lines={3} label="Consultando el historial" />
      ) : query.data.items.length === 0 ? (
        <EmptyState title="sin incidentes resueltos" hint="los incidentes cerrados quedan acá" />
      ) : (
        <ul className={styles.accountList} aria-label="Incidentes resueltos">
          {query.data.items.map((incident) => (
            <IncidentItem key={incident.id} incident={incident} />
          ))}
        </ul>
      )}
    </Cell>
  );
}
