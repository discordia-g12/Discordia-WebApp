import { useState } from 'react';
import {
  ACCOUNT_STATE_LABEL,
  ACCOUNT_STATE_OPTIONS,
  BACKOFFICE_SECTIONS,
  BACKOFFICE_SOON_NOTE,
  INVESTIGATION_TARGET_OPTIONS,
  SAMPLE_CASE,
  SAMPLE_PLATFORM_SERVERS,
  SAMPLE_PLATFORM_USERS,
  SUSPENSION_DURATIONS,
  filterPlatformServers,
  filterPlatformUsers,
  formatBackofficeDate,
  type AccountState,
  type AccountStateFilter,
  type BackofficeSection,
  type InvestigationTarget,
} from '@discordia/core';
import type { User } from '../../types';
import { ActionLink, BlockButton, Choice, EmptyState, SquareAvatar, UnderlineInput } from '../../ui';
import { SettingsCell, SettingsRow, SettingsScreen } from '../settings/SettingsScreen';
import styles from './AdminScreen.module.css';

const SOON_NOTE = BACKOFFICE_SOON_NOTE;

export interface AdminScreenProps {
  currentUser: User;
  onClose: () => void;
}

/**
 * Backoffice de administración de la plataforma (prototipo), sobre SettingsScreen: USUARIOS (listado con
 * filtros, suspender y reactivar), SERVIDORES (listado, suspender y eliminar) e INVESTIGACIÓN (expediente
 * de un usuario o servidor). Solo lo abre quien tiene el rol de plataforma "staff" (FullScreenViews). No
 * hay endpoints de staff todavía: todas las celdas quedan deshabilitadas con "próximamente" y los
 * listados muestran las filas de ejemplo de core (admin/backoffice.ts), las mismas que en mobile.
 */
export function AdminScreen({ currentUser, onClose }: AdminScreenProps) {
  const [section, setSection] = useState<BackofficeSection>('users');

  return (
    <SettingsScreen
      title="Administración"
      identity={
        <div className={styles.identity}>
          <SquareAvatar user={{ ...currentUser, avatar: currentUser.avatarUrl || currentUser.avatar }} size={32} />
          <div>
            <p className={styles.identityName}>{currentUser.displayName}</p>
            <p className={styles.meta}>backoffice de la plataforma/</p>
          </div>
        </div>
      }
      sections={BACKOFFICE_SECTIONS}
      active={section}
      onSelect={setSection}
      onClose={onClose}
    >
      {section === 'users' && <UsersSection />}
      {section === 'servers' && <ServersSection />}
      {section === 'investigation' && <InvestigationSection />}
    </SettingsScreen>
  );
}

/** Estado de una cuenta o servidor como etiqueta con borde (suspendido, invertido). */
function StateTag({ state }: { state: AccountState }) {
  return <span className={`${styles.tag} ${state === 'suspended' ? styles.tagSuspended : ''}`}>{ACCOUNT_STATE_LABEL[state]}</span>;
}

/** Suspender (usuario o servidor): a quién, por cuánto y por qué. */
function SuspendForm({ targetLabel, placeholder }: { targetLabel: string; placeholder: string }) {
  const [target, setTarget] = useState('');
  const [duration, setDuration] = useState(SUSPENSION_DURATIONS[0]);
  const [reason, setReason] = useState('');
  return (
    <>
      <UnderlineInput label={targetLabel} value={target} onChange={(e) => setTarget(e.target.value)} placeholder={placeholder} />
      <Choice
        label="Duración de la suspensión"
        options={SUSPENSION_DURATIONS.map((d) => ({ value: d, label: d }))}
        value={duration}
        onChange={setDuration}
      />
      <UnderlineInput label="motivo" value={reason} maxLength={512} onChange={(e) => setReason(e.target.value)} hint="queda en el expediente" />
      <BlockButton tone="danger">Suspender</BlockButton>
    </>
  );
}

// ==========================================
// USUARIOS
// ==========================================

function UsersSection() {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<AccountStateFilter>('all');
  const users = filterPlatformUsers(SAMPLE_PLATFORM_USERS, search, stateFilter);
  const suspended = SAMPLE_PLATFORM_USERS.filter((u) => u.state === 'suspended');

  return (
    <>
      <SettingsCell title="Usuarios de la plataforma" wide soon soonNote={SOON_NOTE}>
        <UnderlineInput label="buscar usuarios" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="nombre, @usuario o email" />
        <Choice label="Filtrar por estado" options={ACCOUNT_STATE_OPTIONS} value={stateFilter} onChange={setStateFilter} />
        <div className={styles.list}>
          {users.length === 0 && <EmptyState title="sin resultados" hint="ningún usuario coincide con los filtros" />}
          {users.map((u) => (
            <div key={u.id} className={styles.row}>
              <SquareAvatar user={u} size={28} />
              <p className={styles.rowName}>
                <strong>{u.displayName}</strong>
                <span className={styles.meta}>
                  {' '}
                  @{u.username} · {u.email} · alta {formatBackofficeDate(u.createdAt)} · {u.reports} reportes
                </span>
              </p>
              <StateTag state={u.state} />
              <span className={styles.links}>
                {u.state === 'active' ? <ActionLink>suspender</ActionLink> : <ActionLink>reactivar</ActionLink>}
                <ActionLink>expediente</ActionLink>
              </span>
            </div>
          ))}
        </div>
      </SettingsCell>

      <SettingsCell title="Suspender usuario" soon soonNote={SOON_NOTE}>
        <SuspendForm targetLabel="usuario" placeholder="@usuario o email" />
        <p className={styles.meta}>/ La cuenta no va a poder iniciar sesión en ningún servidor mientras dure.</p>
      </SettingsCell>

      <SettingsCell title="Reactivar usuario" soon soonNote={SOON_NOTE}>
        {suspended.length === 0 && <EmptyState title="no hay suspendidos" hint="las cuentas suspendidas aparecerán aquí" />}
        {suspended.map((u) => (
          <SettingsRow key={u.id} title={u.displayName} description={`@${u.username} · suspendido`}>
            <BlockButton>Reactivar</BlockButton>
          </SettingsRow>
        ))}
      </SettingsCell>
    </>
  );
}

// ==========================================
// SERVIDORES
// ==========================================

function ServersSection() {
  const [search, setSearch] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const servers = filterPlatformServers(SAMPLE_PLATFORM_SERVERS, search);

  return (
    <>
      <SettingsCell title={`Servidores de la plataforma — ${SAMPLE_PLATFORM_SERVERS.length}`} wide soon soonNote={SOON_NOTE}>
        <UnderlineInput label="buscar servidores" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="nombre o dueña/o" />
        <div className={styles.list}>
          {servers.length === 0 && <EmptyState title="sin resultados" hint="ningún servidor coincide con la búsqueda" />}
          {servers.map((s) => (
            <div key={s.id} className={styles.row}>
              <SquareAvatar user={{ displayName: s.name, username: s.name }} size={28} />
              <p className={styles.rowName}>
                <strong>{s.name}</strong>
                <span className={styles.meta}>
                  {' '}
                  de @{s.owner} · {s.members} miembros · creado {formatBackofficeDate(s.createdAt)} · {s.reports} reportes
                </span>
              </p>
              <StateTag state={s.state} />
              <span className={styles.links}>
                {s.state === 'active' ? <ActionLink>suspender</ActionLink> : <ActionLink>reactivar</ActionLink>}
                <ActionLink>eliminar</ActionLink>
                <ActionLink>expediente</ActionLink>
              </span>
            </div>
          ))}
        </div>
      </SettingsCell>

      <SettingsCell title="Suspender servidor" soon soonNote={SOON_NOTE}>
        <SuspendForm targetLabel="servidor" placeholder="nombre o id del servidor" />
        <p className={styles.meta}>/ Nadie va a poder entrar, escribir ni hablar en el servidor mientras dure.</p>
      </SettingsCell>

      <SettingsCell title="Eliminar servidor" soon soonNote={SOON_NOTE}>
        <UnderlineInput
          label="nombre del servidor"
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          hint="escribilo completo para confirmar"
        />
        <p className={styles.meta}>/ Se borran los canales, mensajes y roles. No se puede deshacer.</p>
        <BlockButton tone="danger">Eliminar servidor</BlockButton>
      </SettingsCell>
    </>
  );
}

// ==========================================
// INVESTIGACIÓN
// ==========================================

function InvestigationSection() {
  const [target, setTarget] = useState<InvestigationTarget>('user');
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const { subject, stats, events } = SAMPLE_CASE;

  return (
    <>
      <SettingsCell title="Buscar expediente" soon soonNote={SOON_NOTE}>
        <Choice label="Tipo de expediente" options={INVESTIGATION_TARGET_OPTIONS} value={target} onChange={setTarget} />
        <UnderlineInput
          label={target === 'user' ? 'usuario' : 'servidor'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={target === 'user' ? '@usuario, email o id' : 'nombre o id del servidor'}
        />
        <BlockButton>Abrir expediente</BlockButton>
      </SettingsCell>

      <SettingsCell title="Resumen" soon soonNote={SOON_NOTE}>
        <dl className={styles.stats}>
          <div>
            <dt>reportes</dt>
            <dd>{stats.reports}</dd>
          </div>
          <div>
            <dt>sanciones</dt>
            <dd>{stats.sanctions}</dd>
          </div>
          <div>
            <dt>servidores</dt>
            <dd>{stats.servers}</dd>
          </div>
          <div>
            <dt>estado</dt>
            <dd className={styles.statState}>
              <StateTag state={subject.state} />
            </dd>
          </div>
        </dl>
      </SettingsCell>

      <SettingsCell title="Expediente" wide soon soonNote={SOON_NOTE}>
        <SettingsRow
          title={`${subject.displayName}/`}
          description={`@${subject.username} · alta ${formatBackofficeDate(subject.createdAt)} · ejemplo de expediente`}
        >
          <ActionLink>exportar</ActionLink>
        </SettingsRow>
        <ol className={styles.timeline} aria-label="Historial del expediente">
          {events.map((event) => (
            <li key={`${event.date}-${event.text}`}>
              <span className={styles.timelineDate}>{formatBackofficeDate(event.date)}</span>
              <span>/ {event.text}</span>
            </li>
          ))}
        </ol>
        <UnderlineInput label="nota interna" value={note} onChange={(e) => setNote(e.target.value)} placeholder="agregá una nota al expediente" />
      </SettingsCell>
    </>
  );
}
