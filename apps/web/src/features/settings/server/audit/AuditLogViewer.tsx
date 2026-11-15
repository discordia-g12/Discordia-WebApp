import { AUDIT_CATEGORY_OPTIONS, useServerAuditLogs } from '@discordia/core';
import { ActionLink, BlockButton, EmptyState, Skeleton, UnderlineInput } from '../../../../ui';
import { AuditLogRow } from './AuditLogRow';
import styles from './AuditLogViewer.module.css';

export interface AuditLogViewerProps {
  serverId: string;
}

export function AuditLogViewer({ serverId }: AuditLogViewerProps) {
  const {
    categoryFilter,
    setCategoryFilter,
    actorSearch,
    setActorSearch,
    entries,
    profiles,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    refetch,
    isForbidden,
    error,
    errorMessage,
  } = useServerAuditLogs(serverId);

  const hasSearch = Boolean(actorSearch?.trim());

  return (
    <div className={styles.container}>
      {/* Campo de búsqueda por usuario/moderador */}
      <div className={styles.searchBar}>
        <div className={styles.searchInputWrapper}>
          <UnderlineInput
            label="buscar por usuario"
            placeholder="nombre o usuario que realizó la acción"
            value={actorSearch}
            onChange={(e) => setActorSearch(e.target.value)}
          />
        </div>
        {hasSearch && (
          <ActionLink onPress={() => setActorSearch('')}>limpiar</ActionLink>
        )}
      </div>

      {/* Barra de filtros por categoría */}
      <nav className={styles.filterBar} aria-label="Filtrar por categoría">
        {AUDIT_CATEGORY_OPTIONS.map((opt) => {
          const isActive = categoryFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className={`${styles.filterChip} ${isActive ? styles.filterChipActive : ''}`}
              onClick={() => setCategoryFilter(opt.id)}
              aria-pressed={isActive}
            >
              {opt.label}
            </button>
          );
        })}
      </nav>

      {hasSearch && hasNextPage && (
        <p className={styles.searchMeta}>
          / La búsqueda filtra sobre las acciones ya cargadas: tocá &quot;Cargar más acciones&quot; para incluir eventos anteriores.
        </p>
      )}

      {/* Estados de carga, error y vacío */}
      {isLoading ? (
        <Skeleton lines={5} label="Cargando registro de auditoría" />
      ) : isForbidden ? (
        <EmptyState
          title="sin permisos de moderación"
          hint="tu rol no tiene permisos para ver el registro de auditoría de este servidor"
        />
      ) : error ? (
        <div className={styles.errorBox}>
          <EmptyState
            title="error al cargar la auditoría"
            hint={errorMessage || 'no pudimos consultar el registro de auditoría'}
          />
          <ActionLink onPress={() => void refetch()}>reintentar</ActionLink>
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          title="sin acciones registradas"
          hint={
            hasSearch
              ? `ninguna acción de "${actorSearch.trim()}" encontrada`
              : categoryFilter === 'all'
                ? 'las acciones de administración del servidor aparecerán aquí'
                : 'no hay acciones registradas en esta categoría'
          }
        />
      ) : (
        <>
          <ul className={styles.list}>
            {entries.map((entry) => (
              <AuditLogRow
                key={entry.id}
                entry={entry}
                actor={profiles[entry.actorId] || null}
                targetUser={entry.targetId ? profiles[entry.targetId] || null : null}
                onFilterByActor={(name) => setActorSearch(name)}
              />
            ))}
          </ul>

          {hasNextPage && (
            <BlockButton
              loading={isFetchingNextPage}
              onPress={() => void loadMore()}
              className={styles.loadMore}
            >
              Cargar más acciones
            </BlockButton>
          )}
        </>
      )}
    </div>
  );
}
