import React, { useState } from 'react'
import { Pressable, View } from 'react-native'
import Svg, { Circle, Line, Path, Polyline, Text as SvgText } from 'react-native-svg'
import {
  formatMetricValue,
  isServerMetricsForbidden,
  serverMetricsErrorMessage,
  useExportServerActivityMetricsMutation,
  useServerActivityMetricsQuery,
} from '@discordia/core'
import { makeStyles, useTheme } from '../../theme'
import { ActionLink, BlockButton, EmptyState, Skeleton, Text } from '../../ui'
import { useUI } from '../../providers/AppProviders'
import { shareTextFile } from '../../utils/shareFile'

interface ServerActivityMetricsProps {
  serverId: string
  /** Para el nombre del archivo exportado. */
  serverName?: string
}

const PRESET_DAYS: Array<{ label: string; value: 7 | 14 | 30 | 90 }> = [
  { label: '7 días', value: 7 },
  { label: '14 días', value: 14 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
]

function shortDate(isoDate: string): string {
  const parts = isoDate.split('-')
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : isoDate
}

interface MetricChartProps {
  title: string
  unitLabel: string
  color: string
  total: number | null
  points: Array<{ date: string; value: number | null }>
}

function MetricTrendChart({ title, unitLabel, color, total, points }: MetricChartProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const styles = useStyles()
  const theme = useTheme()

  const hasAvailableData = total !== null && points.length > 0
  const width = 320
  const height = 135
  const padL = 28
  const padR = 14
  const padT = 12
  const padB = 22
  const plotW = width - padL - padR
  const plotH = height - padT - padB

  const maxVal = Math.max(1, ...points.map((p) => p.value ?? 0))
  const yTicks = maxVal === 1 ? [0, 1] : [0, Math.round(maxVal / 2), maxVal]

  const xOf = (idx: number) =>
    points.length <= 1 ? padL + plotW / 2 : padL + (idx / (points.length - 1)) * plotW

  const yOf = (val: number) => padT + plotH - (val / maxVal) * plotH

  const linePoints = points.map((p, i) => `${xOf(i)},${yOf(p.value ?? 0)}`).join(' ')
  const areaPath =
    points.length > 1
      ? `M ${xOf(0)},${padT + plotH} ` +
        points.map((p, i) => `L ${xOf(i)},${yOf(p.value ?? 0)}`).join(' ') +
        ` L ${xOf(points.length - 1)},${padT + plotH} Z`
      : ''

  const labelIndices =
    points.length <= 5 ? points.map((_, i) => i) : [0, Math.floor(points.length / 2), points.length - 1]
  const selected = selectedIdx !== null && points[selectedIdx] ? points[selectedIdx] : null

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartHeader}>
        <Text variant="label" tone="muted">
          {title}
        </Text>
        <Text variant="bodySmall" bold>
          {formatMetricValue(total)}
        </Text>
      </View>

      {!hasAvailableData ? (
        <Text variant="meta" tone="muted">
          Sin datos disponibles para esta fuente.
        </Text>
      ) : (
        <>
          <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
            {yTicks.map((tick) => {
              const y = yOf(tick)
              return (
                <React.Fragment key={tick}>
                  <Line x1={padL} x2={width - padR} y1={y} y2={y} stroke={theme.colors.line} strokeDasharray="3 3" />
                  <SvgText x={padL - 5} y={y + 3} fontSize={9} fill={theme.colors.textMuted} textAnchor="end">
                    {tick}
                  </SvgText>
                </React.Fragment>
              )
            })}

            {areaPath ? <Path d={areaPath} fill={color} fillOpacity={0.14} /> : null}

            <Polyline fill="none" stroke={color} strokeWidth={2.5} points={linePoints} />

            {points.map((p, i) => {
              const isActive = selectedIdx === i
              return (
                <Circle
                  key={p.date}
                  cx={xOf(i)}
                  cy={yOf(p.value ?? 0)}
                  r={isActive ? 5 : 3}
                  fill={isActive ? theme.colors.background : color}
                  stroke={isActive ? color : theme.colors.background}
                  strokeWidth={isActive ? 2.5 : 1}
                  onPress={() => setSelectedIdx(isActive ? null : i)}
                />
              )
            })}

            {labelIndices.map((idx) => (
              <SvgText
                key={points[idx].date}
                x={xOf(idx)}
                y={height - 4}
                fontSize={10}
                fill={theme.colors.textMuted}
                textAnchor="middle"
              >
                {shortDate(points[idx].date)}
              </SvgText>
            ))}
          </Svg>

          {selected && (
            <View style={styles.tooltip}>
              <Text variant="meta">{shortDate(selected.date)}</Text>
              <Text variant="meta" tone="muted">
                {formatMetricValue(selected.value)} {unitLabel}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

export function ServerActivityMetrics({ serverId, serverName = 'servidor' }: ServerActivityMetricsProps) {
  const [days, setDays] = useState<7 | 14 | 30 | 90>(30)
  const styles = useStyles()
  const { showToast } = useUI()

  const { data, isLoading, isError, error, refetch } = useServerActivityMetricsQuery(serverId, { days })

  // Exportar a CSV (ADR-06 de Notification-Audit-Metrics): se confirma el período y se comparte el archivo
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const exportMutation = useExportServerActivityMetricsMutation(serverId, serverName)
  const exporting = exportMutation.isPending || sharing
  const exportError = exportMutation.isError ? serverMetricsErrorMessage(exportMutation.error) : shareError

  const selectDays = (value: 7 | 14 | 30 | 90) => {
    setDays(value)
    setExportConfirmOpen(false)
  }

  const openExportConfirm = () => {
    exportMutation.reset()
    setShareError(null)
    setExportConfirmOpen(true)
  }

  const handleConfirmExport = () => {
    setShareError(null)
    exportMutation.mutate(
      { days },
      {
        onSuccess: async (file) => {
          setSharing(true)
          try {
            await shareTextFile(file.filename, file.content, 'text/csv')
            setExportConfirmOpen(false)
            showToast(`Se generó ${file.filename}`, 'success')
          } catch (err) {
            setShareError(err instanceof Error && err.message ? err.message : 'No se pudo compartir el archivo.')
          } finally {
            setSharing(false)
          }
        },
      },
    )
  }

  if (isError && isServerMetricsForbidden(error)) {
    return (
      <View style={styles.emptyBox}>
        <EmptyState title="Sin permisos de administración" hint={serverMetricsErrorMessage(error)} />
      </View>
    )
  }

  const series = data?.series ?? []
  const hasEmptyPeriod = data && !data.partial && !data.hasActivity

  return (
    <View style={styles.container}>
      <View style={styles.periodRow}>
        {PRESET_DAYS.map((opt) => {
          const active = days === opt.value
          return (
            <Pressable
              key={opt.value}
              onPress={() => selectDays(opt.value)}
              style={[styles.periodBtn, active && styles.periodBtnActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text variant="meta" tone={active ? 'inverse' : 'muted'}>
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <ActionLink onPress={openExportConfirm} disabled={!data || isLoading || exportConfirmOpen}>
        exportar CSV
      </ActionLink>

      {exportConfirmOpen && (
        <View style={styles.exportConfirm} accessibilityLabel="Exportar métricas">
          <Text variant="bodySmall">
            / Se va a generar un archivo CSV con las métricas diarias de los últimos {days} días: miembros activos,
            mensajes enviados y nuevos miembros. Después elegís dónde guardarlo o a quién mandarlo.
          </Text>
          {exportError && (
            <Text variant="bodySmall" style={styles.errorText} accessibilityRole="alert">
              {exportError}
            </Text>
          )}
          <View style={styles.exportActions}>
            <ActionLink onPress={() => setExportConfirmOpen(false)} disabled={exporting}>
              cancelar
            </ActionLink>
            <BlockButton onPress={handleConfirmExport} loading={exporting}>
              Exportar CSV
            </BlockButton>
          </View>
        </View>
      )}

      {isLoading && <Skeleton lines={3} label="Cargando métricas de actividad" />}

      {isError && !isServerMetricsForbidden(error) && (
        <View style={styles.errorWrap}>
          <Text variant="bodySmall" style={styles.errorText}>
            {serverMetricsErrorMessage(error)}
          </Text>
          <ActionLink onPress={() => void refetch()}>Reintentar</ActionLink>
        </View>
      )}

      {data && (
        <>
          {data.partial && (
            <Text variant="meta" tone="muted">
              Algunas métricas no pudieron consultarse en este momento; mostramos los datos disponibles.
            </Text>
          )}

          <View style={styles.summaryGrid}>
            <View style={styles.card}>
              <Text variant="label" tone="muted">
                Miembros activos
              </Text>
              <Text variant="heading">{formatMetricValue(data.activeMembers)}</Text>
            </View>
            <View style={styles.card}>
              <Text variant="label" tone="muted">
                Mensajes enviados
              </Text>
              <Text variant="heading">{formatMetricValue(data.messagesSent)}</Text>
            </View>
            <View style={styles.card}>
              <Text variant="label" tone="muted">
                Nuevos miembros
              </Text>
              <Text variant="heading">{formatMetricValue(data.newMembers)}</Text>
            </View>
          </View>

          {hasEmptyPeriod ? (
            <View style={styles.emptyBox}>
              <EmptyState
                title="No hubo actividad en el período seleccionado"
                hint="No se registraron miembros activos, mensajes enviados ni ingresos nuevos en estas fechas. Probá ampliando el período."
              />
            </View>
          ) : (
            series.length > 0 && (
              <View style={styles.chartsStack}>
                <MetricTrendChart
                  title="Miembros activos"
                  unitLabel="miembros activos"
                  color="#23a55a"
                  total={data.activeMembers}
                  points={series.map((p) => ({ date: p.date, value: p.activeMembers }))}
                />
                <MetricTrendChart
                  title="Mensajes enviados"
                  unitLabel="mensajes"
                  color="#5865f2"
                  total={data.messagesSent}
                  points={series.map((p) => ({ date: p.date, value: p.messagesSent }))}
                />
                <MetricTrendChart
                  title="Nuevos miembros"
                  unitLabel="nuevos miembros"
                  color="#f0b232"
                  total={data.newMembers}
                  points={series.map((p) => ({ date: p.date, value: p.newMembers }))}
                />
              </View>
            )
          )}
        </>
      )}
    </View>
  )
}

const useStyles = makeStyles((t) => ({
  container: {
    gap: t.space[3],
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.space[2],
  },
  periodBtn: {
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    paddingVertical: t.space[1],
    paddingHorizontal: t.space[2],
  },
  periodBtnActive: {
    backgroundColor: t.colors.inverseBackground,
    borderColor: t.colors.inverseBackground,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.space[2],
  },
  card: {
    minWidth: 100,
    flex: 1,
    padding: t.space[2],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    gap: t.space[1],
  },
  chartsStack: {
    gap: t.space[2],
  },
  chartWrap: {
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    padding: t.space[2],
    gap: t.space[2],
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyBox: {
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    padding: t.space[3],
  },
  errorWrap: {
    gap: t.space[2],
  },
  exportConfirm: {
    gap: t.space[3],
    padding: t.space[3],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.lineStrong,
  },
  exportActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: t.space[4],
  },
  errorText: {
    color: t.colors.danger,
  },
  tooltip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: t.space[2],
    paddingTop: t.space[1],
    borderTopWidth: t.lines.hairline,
    borderTopColor: t.colors.line,
  },
}))
