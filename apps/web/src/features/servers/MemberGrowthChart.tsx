import { useMemo, useState } from 'react';
import { useMemberGrowthQuery, type MemberGrowthPoint } from '@discordia/core';
import { Skeleton } from '../../ui';
import styles from './MemberGrowthChart.module.css';

interface MemberGrowthChartProps {
  serverId: string;
}

export function MemberGrowthChart({ serverId }: MemberGrowthChartProps) {
  const [days, setDays] = useState<number>(30);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { data: response, isLoading, isError, error } = useMemberGrowthQuery(serverId, { days });

  const points = useMemo(() => response?.data ?? [], [response?.data]);

  const { minVal, maxVal, totalJoined, totalLeft, netChange } = useMemo(() => {
    if (!points.length) return { minVal: 0, maxVal: 1, totalJoined: 0, totalLeft: 0, netChange: 0 };
    let min = points[0].member_count;
    let max = points[0].member_count;
    let joined = 0;
    let left = 0;
    for (const p of points) {
      if (p.member_count < min) min = p.member_count;
      if (p.member_count > max) max = p.member_count;
      joined += p.joined;
      left += p.left;
    }
    const net = points[points.length - 1].member_count - points[0].member_count;
    return {
      minVal: Math.max(0, min - 1),
      maxVal: Math.max(min + 1, max + 1),
      totalJoined: joined,
      totalLeft: left,
      netChange: net,
    };
  }, [points]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Skeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.container}>
        <p className={styles.errorFeedback}>
          / No se pudieron cargar las métricas de crecimiento: {(error as Error)?.message || 'Error desconocido'}
        </p>
      </div>
    );
  }

  const chartWidth = 560;
  const chartHeight = 180;
  const paddingX = 40;
  const paddingY = 25;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const getCoordinates = (p: MemberGrowthPoint, index: number) => {
    const x = paddingX + (points.length > 1 ? (index / (points.length - 1)) * usableWidth : usableWidth / 2);
    const range = maxVal - minVal || 1;
    const y = paddingY + usableHeight - ((p.member_count - minVal) / range) * usableHeight;
    return { x, y };
  };

  const polylineCoords = points.map((p, i) => {
    const { x, y } = getCoordinates(p, i);
    return `${x},${y}`;
  });

  const areaCoords = [
    `${paddingX + (points.length > 1 ? 0 : usableWidth / 2)},${paddingY + usableHeight}`,
    ...polylineCoords,
    `${paddingX + (points.length > 1 ? usableWidth : usableWidth / 2)},${paddingY + usableHeight}`,
  ].join(' ');

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : points[points.length - 1];

  const formatDateLabel = (isoDate: string) => {
    const parts = isoDate.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return isoDate;
  };

  return (
    <div className={styles.container} aria-label="Gráfico de evolución de miembros">
      <div className={styles.controls}>
        <div className={styles.periodButtons} role="group" aria-label="Seleccionar período">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              className={`${styles.periodBtn} ${days === d ? styles.periodBtnActive : ''}`}
              onClick={() => {
                setDays(d);
                setHoveredIndex(null);
              }}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Miembros actuales</span>
          <span className={styles.cardValue}>{response?.current_member_count ?? 0}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Crecimiento neto</span>
          <span className={`${styles.cardValue} ${netChange > 0 ? styles.positive : netChange < 0 ? styles.negative : ''}`}>
            {netChange > 0 ? `+${netChange}` : netChange}
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Altas en período</span>
          <span className={`${styles.cardValue} ${styles.positive}`}>+{totalJoined}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Bajas en período</span>
          <span className={`${styles.cardValue} ${styles.negative}`}>-{totalLeft}</span>
        </div>
      </div>

      <div className={styles.chartWrap}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className={styles.svgChart}
          role="img"
          aria-label="Línea de evolución de miembros día a día"
        >
          {/* Y Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={chartWidth - paddingX}
            y2={paddingY}
            className={styles.gridLine}
          />
          <text x={paddingX - 8} y={paddingY + 4} textAnchor="end" className={styles.axisText}>
            {maxVal}
          </text>

          <line
            x1={paddingX}
            y1={paddingY + usableHeight / 2}
            x2={chartWidth - paddingX}
            y2={paddingY + usableHeight / 2}
            className={styles.gridLine}
          />
          <text
            x={paddingX - 8}
            y={paddingY + usableHeight / 2 + 4}
            textAnchor="end"
            className={styles.axisText}
          >
            {Math.round((maxVal + minVal) / 2)}
          </text>

          <line
            x1={paddingX}
            y1={paddingY + usableHeight}
            x2={chartWidth - paddingX}
            y2={paddingY + usableHeight}
            className={styles.gridLine}
          />
          <text x={paddingX - 8} y={paddingY + usableHeight + 4} textAnchor="end" className={styles.axisText}>
            {minVal}
          </text>

          {/* Area & Polyline */}
          {points.length > 0 && (
            <>
              <polygon points={areaCoords} className={styles.areaPath} />
              <polyline points={polylineCoords.join(' ')} className={styles.linePath} />
            </>
          )}

          {/* Data dots */}
          {points.map((p, i) => {
            const { x, y } = getCoordinates(p, i);
            const isHovered = hoveredIndex === i;
            return (
              <circle
                key={p.date}
                cx={x}
                cy={y}
                r={isHovered ? 5.5 : 3.5}
                className={`${styles.dataDot} ${isHovered ? styles.dataDotActive : ''}`}
                onMouseEnter={() => setHoveredIndex(i)}
                tabIndex={0}
                aria-label={`${p.date}: ${p.member_count} miembros`}
              />
            );
          })}

          {/* X Axis labels (First, Middle, Last) */}
          {points.length > 0 && (
            <>
              <text x={paddingX} y={chartHeight - 4} textAnchor="start" className={styles.axisText}>
                {formatDateLabel(points[0].date)}
              </text>
              {points.length > 2 && (
                <text
                  x={paddingX + usableWidth / 2}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className={styles.axisText}
                >
                  {formatDateLabel(points[Math.floor(points.length / 2)].date)}
                </text>
              )}
              {points.length > 1 && (
                <text
                  x={chartWidth - paddingX}
                  y={chartHeight - 4}
                  textAnchor="end"
                  className={styles.axisText}
                >
                  {formatDateLabel(points[points.length - 1].date)}
                </text>
              )}
            </>
          )}
        </svg>

        {activePoint && (
          <div className={styles.tooltip}>
            <div>
              <strong>{activePoint.date}</strong>
              <span className={styles.meta}> (día seleccionado)</span>
            </div>
            <div>
              <span>Miembros: <strong>{activePoint.member_count}</strong></span>
              {' · '}
              <span className={styles.positive}>+{activePoint.joined} altas</span>
              {' · '}
              <span className={styles.negative}>-{activePoint.left} bajas</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
