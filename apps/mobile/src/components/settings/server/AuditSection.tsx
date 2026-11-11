import React, { useState } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import {
  AUDIT_CATEGORY_OPTIONS,
  formatAuditAction,
  formatAuditChanges,
  formatAuditDate,
  formatAuditTarget,
  useServerAuditLogs,
  type AuditCategory,
  type AuditLogEntry,
  type User,
} from '@discordia/core'
import { makeStyles } from '../../../theme'
import { ActionLink, EmptyState, Skeleton, SquareAvatar, Text, UnderlineInput } from '../../../ui'
import { Feedback, SettingsCell } from '../SettingsScreen'

interface AuditSectionProps {
  serverId: string
}

export function AuditSection({ serverId }: AuditSectionProps) {
  const styles = useStyles()
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
  } = useServerAuditLogs(serverId)

  const hasSearch = Boolean(actorSearch?.trim())

  return (
    <SettingsCell title="Registro de auditoría">
      {/* Buscador por usuario/moderador */}
      <UnderlineInput
        label="buscar por usuario"
        value={actorSearch}
        onChangeText={setActorSearch}
        placeholder="nombre o usuario que realizó la acción"
        autoCapitalize="none"
      />

      {/* Filtro horizontal por categoría */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterContainer}
      >
        {AUDIT_CATEGORY_OPTIONS.map(cat => {
          const isActive = categoryFilter === cat.id
          return (
            <Pressable
              key={cat.id}
              onPress={() => setCategoryFilter(cat.id as AuditCategory | 'all')}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                variant="meta"
                bold={isActive}
                style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
              >
                {cat.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Estado sin permisos (403) */}
      {isForbidden && (
        <Feedback tone="error">
          No tienes permisos de moderación para ver el registro de auditoría.
        </Feedback>
      )}

      {/* Error de red / consulta */}
      {error && !isForbidden && (
        <View style={styles.errorBox}>
          <Feedback tone="error">
            {errorMessage || 'Error al cargar el registro de auditoría.'}
          </Feedback>
          <ActionLink onPress={() => refetch()}>reintentar</ActionLink>
        </View>
      )}

      {/* Esqueleto de carga inicial */}
      {isLoading ? (
        <Skeleton lines={6} label="Cargando registro de auditoría" />
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
        <View style={styles.list}>
          {entries.map(entry => (
            <AuditLogRow
              key={entry.id}
              entry={entry}
              actor={profiles[entry.actorId] || null}
              targetUser={entry.targetId ? profiles[entry.targetId] || null : null}
              onFilterByActor={name => setActorSearch(name)}
            />
          ))}
        </View>
      )}

      {/* Paginación / cargar más */}
      {hasNextPage && (
        <ActionLink onPress={loadMore} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'cargando acciones…' : 'cargar más acciones /'}
        </ActionLink>
      )}
    </SettingsCell>
  )
}

interface AuditLogRowProps {
  entry: AuditLogEntry
  actor?: User | null
  targetUser?: User | null
  onFilterByActor?: (name: string) => void
}

function AuditLogRow({ entry, actor, targetUser, onFilterByActor }: AuditLogRowProps) {
  const styles = useStyles()
  const [showChanges, setShowChanges] = useState(false)

  const actorName = actor?.displayName || actor?.username || entry.actorId
  const actionText = formatAuditAction(entry)

  const targetText = formatAuditTarget(entry, targetUser)

  const diffItems = entry.changes ? formatAuditChanges(entry.changes) : []
  const hasDiff = diffItems.length > 0

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <SquareAvatar
          user={{
            displayName: actorName,
            username: actor?.username || entry.actorId,
            avatar: actor?.avatar || null,
          }}
          size="sm"
        />

        <View style={styles.rowContent}>
          <View style={styles.actorLine}>
            {onFilterByActor ? (
              <Pressable
                onPress={() => onFilterByActor(actorName)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar acciones de ${actorName}`}
              >
                <Text variant="bodySmall" bold style={styles.actorName}>
                  {actorName}
                </Text>
              </Pressable>
            ) : (
              <Text variant="bodySmall" bold>
                {actorName}
              </Text>
            )}
            <Text variant="bodySmall" tone="muted">
              {actionText}
            </Text>
            {targetText ? (
              <Text variant="bodySmall" bold>
                {targetText}
              </Text>
            ) : null}
          </View>

          {entry.reason ? (
            <Text variant="meta" tone="muted" style={styles.reasonText}>
              / motivo: {entry.reason}
            </Text>
          ) : null}

          {hasDiff && (
            <View style={styles.diffToggle}>
              <ActionLink onPress={() => setShowChanges(prev => !prev)}>
                {showChanges ? '_ocultar cambios' : '_ver cambios'}
              </ActionLink>
            </View>
          )}

          {showChanges && hasDiff && (
            <View style={styles.diffBox}>
              {diffItems.map(item => (
                <View key={item.key} style={styles.diffItem}>
                  <Text variant="meta" bold>
                    {item.label}:
                  </Text>
                  <View style={styles.diffValues}>
                    {item.oldVal ? (
                      <Text variant="meta" tone="muted" style={styles.diffOld}>
                        {item.oldVal}
                      </Text>
                    ) : null}
                    {item.oldVal && item.newVal ? (
                      <Text variant="meta" tone="muted">
                        →
                      </Text>
                    ) : null}
                    {item.newVal ? (
                      <Text variant="meta" bold style={styles.diffNew}>
                        {item.newVal}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text variant="meta" tone="muted" style={styles.timestamp}>
          {formatAuditDate(entry.createdAt)}
        </Text>
      </View>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  filterContainer: {
    marginVertical: t.space[2],
  },
  filterScroll: {
    gap: t.space[2],
    paddingVertical: t.space[1],
  },
  filterChip: {
    paddingVertical: t.space[1],
    paddingHorizontal: t.space[3],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
  },
  filterChipActive: {
    backgroundColor: t.colors.inverseBackground,
    borderColor: t.colors.inverseBackground,
  },
  filterChipText: {
    color: t.colors.textMuted,
  },
  filterChipTextActive: {
    color: t.colors.inverseText,
  },
  errorBox: {
    gap: t.space[2],
    marginVertical: t.space[2],
  },
  list: {
    gap: t.space[4],
    marginTop: t.space[2],
  },
  row: {
    paddingVertical: t.space[3],
    borderBottomWidth: t.lines.hairline,
    borderBottomColor: t.colors.line,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.space[3],
  },
  rowContent: {
    flex: 1,
    gap: t.space[1],
  },
  actorLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: t.space[2],
  },
  actorName: {
    textDecorationLine: 'underline',
  },
  reasonText: {
    marginTop: 2,
    fontStyle: 'italic',
  },
  timestamp: {
    alignSelf: 'flex-start',
  },
  diffToggle: {
    marginTop: t.space[1],
  },
  diffBox: {
    marginTop: t.space[2],
    padding: t.space[3],
    backgroundColor: t.colors.skyTint,
    borderLeftWidth: 2,
    borderLeftColor: t.colors.lineStrong,
    gap: t.space[2],
  },
  diffItem: {
    gap: 2,
  },
  diffValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: t.space[2],
  },
  diffOld: {
    textDecorationLine: 'line-through',
  },
  diffNew: {},
}))
