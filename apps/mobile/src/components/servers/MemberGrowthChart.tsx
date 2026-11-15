import React, { useMemo, useState } from 'react'
import { LayoutChangeEvent, Pressable, View } from 'react-native'
import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from 'react-native-svg'
import { useMemberGrowthQuery, type MemberGrowthPoint } from '@discordia/core'
import { makeStyles } from '../../theme'
import { Skeleton, Text } from '../../ui'
import { Feedback } from '../settings/SettingsScreen'

interface MemberGrowthChartProps {
  serverId: string
}

export function MemberGrowthChart({ serverId }: MemberGrowthChartProps) {
  const styles = useStyles()
  const [days, setDays] = useState<number>(30)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [chartWidth, setChartWidth] = useState<number>(320)

  const { data: response, isLoading, isError, error } = useMemberGrowthQuery(serverId, { days })

  const points = useMemo(() => response?.data ?? [], [response?.data])

  const { minVal, maxVal, totalJoined, totalLeft, netChange } = useMemo(() => {
    if (!points.length) return { minVal: 0, maxVal: 1, totalJoined: 0, totalLeft: 0, netChange: 0 }
    let min = points[0].member_count
    let max = points[0].member_count
    let joined = 0
    let left = 0
    for (const p of points) {
      if (p.member_count < min) min = p.member_count
      if (p.member_count > max) max = p.member_count
      joined += p.joined
      left += p.left
    }
    const net = points[points.length - 1].member_count - points[0].member_count
    return {
      minVal: Math.max(0, min - 1),
      maxVal: Math.max(min + 1, max + 1),
      totalJoined: joined,
      totalLeft: left,
      netChange: net,
    }
  }, [points])

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width
    if (w > 0) setChartWidth(w)
  }

  if (isLoading) {
    return <Skeleton lines={4} label="Cargando crecimiento" />
  }

  if (isError) {
    return (
      <Feedback tone="error">
        {`No se pudieron cargar las métricas: ${(error as Error)?.message || 'Error'}`}
      </Feedback>
    )
  }

  const chartHeight = 160
  const paddingX = 35
  const paddingY = 20
  const usableWidth = Math.max(10, chartWidth - paddingX * 2)
  const usableHeight = chartHeight - paddingY * 2

  const getCoordinates = (p: MemberGrowthPoint, index: number) => {
    const x = paddingX + (points.length > 1 ? (index / (points.length - 1)) * usableWidth : usableWidth / 2)
    const range = maxVal - minVal || 1
    const y = paddingY + usableHeight - ((p.member_count - minVal) / range) * usableHeight
    return { x, y }
  }

  const polylineCoords = points.map((p, i) => {
    const { x, y } = getCoordinates(p, i)
    return `${x},${y}`
  })

  const areaCoords = [
    `${paddingX + (points.length > 1 ? 0 : usableWidth / 2)},${paddingY + usableHeight}`,
    ...polylineCoords,
    `${paddingX + (points.length > 1 ? usableWidth : usableWidth / 2)},${paddingY + usableHeight}`,
  ].join(' ')

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : points[points.length - 1]

  const formatDateLabel = (isoDate: string) => {
    const parts = isoDate.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`
    return isoDate
  }

  return (
    <View style={styles.container}>
      {/* Selector de período */}
      <View style={styles.periodRow}>
        {[7, 14, 30].map(d => (
          <Pressable
            key={d}
            onPress={() => {
              setDays(d)
              setHoveredIndex(null)
            }}
            style={[styles.periodButton, days === d && styles.periodButtonActive]}
          >
            <Text style={[styles.periodButtonText, days === d && styles.periodButtonTextActive]}>
              {d}d
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tarjetas de métricas rápidas */}
      <View style={styles.summaryGrid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>MIEMBROS</Text>
          <Text style={styles.cardValue}>{response?.current_member_count ?? 0}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>NETO</Text>
          <Text style={[styles.cardValue, netChange > 0 ? styles.pos : netChange < 0 ? styles.neg : null]}>
            {netChange > 0 ? `+${netChange}` : netChange}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ALTAS</Text>
          <Text style={[styles.cardValue, styles.pos]}>+{totalJoined}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>BAJAS</Text>
          <Text style={[styles.cardValue, styles.neg]}>-{totalLeft}</Text>
        </View>
      </View>

      {/* Contenedor del gráfico SVG */}
      <View style={styles.chartWrap} onLayout={onLayout}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Y Grid lines */}
          <Line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
          <SvgText x={paddingX - 6} y={paddingY + 4} fill="#888" fontSize="10" textAnchor="end">
            {maxVal}
          </SvgText>

          <Line x1={paddingX} y1={paddingY + usableHeight / 2} x2={chartWidth - paddingX} y2={paddingY + usableHeight / 2} stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
          <SvgText x={paddingX - 6} y={paddingY + usableHeight / 2 + 4} fill="#888" fontSize="10" textAnchor="end">
            {Math.round((maxVal + minVal) / 2)}
          </SvgText>

          <Line x1={paddingX} y1={paddingY + usableHeight} x2={chartWidth - paddingX} y2={paddingY + usableHeight} stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
          <SvgText x={paddingX - 6} y={paddingY + usableHeight + 4} fill="#888" fontSize="10" textAnchor="end">
            {minVal}
          </SvgText>

          {/* Área y línea */}
          {points.length > 0 && (
            <>
              <Polygon points={areaCoords} fill="rgba(88, 101, 242, 0.15)" />
              <Polyline points={polylineCoords.join(' ')} fill="none" stroke="#5865f2" strokeWidth="2.5" />
            </>
          )}

          {/* Puntos táctiles */}
          {points.map((p, i) => {
            const { x, y } = getCoordinates(p, i)
            const isHovered = hoveredIndex === i
            return (
              <Circle
                key={p.date}
                cx={x}
                cy={y}
                r={isHovered ? 5.5 : 3.5}
                fill={isHovered ? '#ffffff' : '#5865f2'}
                stroke={isHovered ? '#5865f2' : '#ffffff'}
                strokeWidth={isHovered ? 2 : 1}
                onPress={() => setHoveredIndex(i)}
              />
            )
          })}

          {/* Etiquetas eje X */}
          {points.length > 0 && (
            <>
              <SvgText x={paddingX} y={chartHeight - 4} fill="#888" fontSize="10" textAnchor="start">
                {formatDateLabel(points[0].date)}
              </SvgText>
              {points.length > 1 && (
                <SvgText x={chartWidth - paddingX} y={chartHeight - 4} fill="#888" fontSize="10" textAnchor="end">
                  {formatDateLabel(points[points.length - 1].date)}
                </SvgText>
              )}
            </>
          )}
        </Svg>

        {activePoint && (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipDate}>{activePoint.date}</Text>
            <Text style={styles.tooltipInfo}>
              {activePoint.member_count} miembros (
              <Text style={styles.pos}>+{activePoint.joined}</Text> /{' '}
              <Text style={styles.neg}>-{activePoint.left}</Text>)
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  container: {
    gap: t.space[3],
    marginVertical: t.space[2],
  },
  periodRow: {
    flexDirection: 'row',
    gap: t.space[2],
  },
  periodButton: {
    paddingHorizontal: t.space[3],
    paddingVertical: t.space[1],
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
  },
  periodButtonActive: {
    backgroundColor: t.colors.text,
    borderColor: t.colors.text,
  },
  periodButtonText: {
    fontSize: t.text.meta.fontSize,
    color: t.colors.textMuted,
  },
  periodButtonTextActive: {
    color: t.colors.background,
    fontWeight: '700',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: t.space[2],
  },
  card: {
    flex: 1,
    padding: t.space[2],
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 9,
    color: t.colors.textMuted,
    fontWeight: '700',
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: t.colors.text,
    marginTop: 2,
  },
  pos: { color: '#23a55a' },
  neg: { color: '#da373c' },
  chartWrap: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: t.lines.hairline,
    borderColor: t.colors.line,
    paddingVertical: t.space[2],
  },
  tooltip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: t.space[3],
    paddingTop: t.space[2],
    borderTopWidth: t.lines.hairline,
    borderTopColor: t.colors.line,
    marginTop: t.space[1],
  },
  tooltipDate: {
    fontSize: t.text.meta.fontSize,
    fontWeight: '700',
    color: t.colors.text,
  },
  tooltipInfo: {
    fontSize: t.text.meta.fontSize,
    color: t.colors.textMuted,
  },
}))
