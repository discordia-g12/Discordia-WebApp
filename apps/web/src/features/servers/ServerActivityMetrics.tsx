import { useState, type FormEvent } from 'react';
import {
  customRange,
  formatMetricValue,
  isServerMetricsForbidden,
  serverMetricsErrorMessage,
  useExportServerActivityMetricsMutation,
  useServerActivityMetricsQuery,
  type ServerActivityRange,
} from '@discordia/core';
import { ActionLink, BlockButton, EmptyState, Skeleton } from '../../ui';
import { showToast } from '../../app/uiStore';
import { downloadFile } from '../../platform/download';
import growthStyles from './MemberGrowthChart.module.css';
import activityStyles from './ServerActivityMetrics.module.css';

interface ServerActivityMetricsProps {
  serverId: string;
  /** Para el nombre del archivo exportado. */
  serverName?: string;
}

type PeriodOption = 7 | 14 | 30 | 90 | 'custom';

const PRESET_DAYS: Array<{ label: string; value: 7 | 14 | 30 | 90 }> = [
  { label: '7 días', value: 7 },
  { label: '14 días', value: 14 },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
];

function todayInputValue(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : isoDate;
}

/** YYYY-MM-DD (o el inicio de un ISO) → DD/MM/YYYY. */
function longDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : isoDate;
}

/** El período en palabras, para confirmar qué se exporta. En `to` (excluido) se muestra el día anterior. */
function periodLabel(range: ServerActivityRange): string {
  if (range.from && range.to) {
    const lastIncluded = new Date(new Date(range.to).getTime() - 1).toISOString();
    return `del ${longDate(range.from)} al ${longDate(lastIncluded)}`;
  }
  return `de los últimos ${range.days ?? 30} días`;
}

/** Convierte YYYY-MM-DD..YYYY-MM-DD a límites UTC exactos [00:00Z, día siguiente 00:00Z) para evitar un día fantasma al final. */
function toUtcDayBounds(fromYmd: string, toYmd: string): { from: string; to: string } {
  const [y, m, d] = toYmd.split('-').map(Number);
  return {
    from: `${fromYmd}T00:00:00.000Z`,
    to: new Date(Date.UTC(y, m - 1, d + 1)).toISOString(),
  };
}

interface MetricChartProps {
  title: string;
  ariaLabel: string;
  unitLabel: string;
  color: string;
  total: number | null;
  points: Array<{ date: string; value: number | null }>;
}

function MetricTrendChart({ title, ariaLabel, unitLabel, color, total, points }: MetricChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const hasAvailableData = total !== null && points.length > 0;
  const width = 640;
  const height = 165;
  const padL = 36;
  const padR = 16;
  const padT = 14;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxVal = Math.max(1, ...points.map((p) => p.value ?? 0));
  const yTicks = maxVal === 1 ? [0, 1] : [0, Math.round(maxVal / 2), maxVal];

  const xOf = (idx: number) =>
    points.length <= 1 ? padL + plotW / 2 : padL + (idx / (points.length - 1)) * plotW;

  const yOf = (val: number) => padT + plotH - (val / maxVal) * plotH;

  const linePoints = points.map((p, i) => `${xOf(i)},${yOf(p.value ?? 0)}`).join(' ');
  const areaPath =
    points.length > 1
      ? `M ${xOf(0)},${padT + plotH} ` +
        points.map((p, i) => `L ${xOf(i)},${yOf(p.value ?? 0)}`).join(' ') +
        ` L ${xOf(points.length - 1)},${padT + plotH} Z`
      : '';

  const labelIndices =
    points.length <= 7
      ? points.map((_, i) => i)
      : [0, Math.floor(points.length / 2), points.length - 1];

  const hovered = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : null;

  return (
    <div className={growthStyles.chartWrap}>
      <div className={activityStyles.chartHeader}>
        <span className={activityStyles.chartTitle}>
          <span className={activityStyles.chartSwatch} style={{ backgroundColor: color }} />
          {title}
        </span>
        <span className={activityStyles.chartTotal}>{formatMetricValue(total)}</span>
      </div>

      {!hasAvailableData ? (
        <p className={growthStyles.meta}>Sin datos disponibles para esta fuente.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className={growthStyles.svgChart} role="img" aria-label={ariaLabel}>
            {yTicks.map((tick) => {
              const y = yOf(tick);
              return (
                <g key={tick}>
                  <line x1={padL} x2={width - padR} y1={y} y2={y} className={growthStyles.gridLine} />
                  <text x={padL - 6} y={y + 3} textAnchor="end" className={growthStyles.axisText}>
                    {tick}
                  </text>
                </g>
              );
            })}

            {areaPath && <path d={areaPath} fill={color} fillOpacity={0.12} />}

            <polyline
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={linePoints}
            />

            {points.map((p, i) => {
              const isActive = hoveredIdx === i;
              return (
                <circle
                  key={p.date}
                  cx={xOf(i)}
                  cy={yOf(p.value ?? 0)}
                  r={isActive ? 5 : 3}
                  fill={isActive ? '#ffffff' : color}
                  stroke={isActive ? color : '#ffffff'}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}

            {labelIndices.map((idx) => (
              <text
                key={points[idx].date}
                x={xOf(idx)}
                y={height - 6}
                textAnchor="middle"
                className={growthStyles.axisText}
              >
                {shortDate(points[idx].date)}
              </text>
            ))}
          </svg>

          {hovered && (
            <div className={growthStyles.tooltip}>
              <span>{shortDate(hovered.date)}</span>
              <span>
                {formatMetricValue(hovered.value)} {unitLabel}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ServerActivityMetrics({ serverId, serverName = 'servidor' }: ServerActivityMetricsProps) {
  const [period, setPeriod] = useState<PeriodOption>(30);
  const [fromInput, setFromInput] = useState(() => todayInputValue(-6));
  const [toInput, setToInput] = useState(() => todayInputValue(0));
  const [customDates, setCustomDates] = useState<{ from: string; to: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const queryRange: ServerActivityRange =
    period === 'custom' && customDates ? customDates : { days: period === 'custom' ? 30 : period };

  const { data, isLoading, isError, error, refetch } = useServerActivityMetricsQuery(serverId, queryRange);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const exportMutation = useExportServerActivityMetricsMutation(serverId, serverName);
  // Personalizado sin aplicar todavía: no hay un período elegido para exportar
  const canExport = Boolean(data) && !isLoading && !(period === 'custom' && !customDates);

  const openExportConfirm = () => {
    exportMutation.reset();
    setExportConfirmOpen(true);
  };

  const handleConfirmExport = () => {
    exportMutation.mutate(queryRange, {
      onSuccess: (file) => {
        downloadFile(file.filename, file.content, 'text/csv;charset=utf-8');
        setExportConfirmOpen(false);
        showToast(`Se descargó ${file.filename}`, 'success');
      },
    });
  };

  const handleSelectPreset = (days: 7 | 14 | 30 | 90) => {
    setPeriod(days);
    setValidationError(null);
    setExportConfirmOpen(false);
  };

  const handleSelectCustom = () => {
    setPeriod('custom');
    setValidationError(null);
    setExportConfirmOpen(false);
    const initial = customRange(fromInput, toInput);
    if (!initial.error && initial.range) {
      setCustomDates(toUtcDayBounds(fromInput, toInput));
    }
  };

  const handleApplyCustom = (e: FormEvent) => {
    e.preventDefault();
    const res = customRange(fromInput, toInput);
    if (res.error || !res.range) {
      setValidationError(res.error ?? 'Período inválido.');
      return;
    }
    setValidationError(null);
    setCustomDates(toUtcDayBounds(fromInput, toInput));
  };

  if (isError && isServerMetricsForbidden(error)) {
    return (
      <div className={activityStyles.emptyPanel} role="alert" data-testid="server-activity-forbidden">
        <EmptyState title="Sin permisos de administración" hint={serverMetricsErrorMessage(error)} />
      </div>
    );
  }

  const series = data?.series ?? [];
  const hasEmptyPeriod = data && !data.partial && !data.hasActivity;

  return (
    <div className={growthStyles.container} data-testid="server-activity-metrics">
      <div className={growthStyles.controls}>
        <div className={growthStyles.periodButtons} role="group" aria-label="Período de actividad">
          {PRESET_DAYS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${growthStyles.periodBtn} ${period === opt.value ? growthStyles.periodBtnActive : ''}`}
              onClick={() => handleSelectPreset(opt.value)}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            className={`${growthStyles.periodBtn} ${period === 'custom' ? growthStyles.periodBtnActive : ''}`}
            onClick={handleSelectCustom}
          >
            Personalizado
          </button>
        </div>
        <ActionLink onPress={openExportConfirm} disabled={!canExport || exportConfirmOpen}>
          exportar CSV
        </ActionLink>
      </div>

      {exportConfirmOpen && (
        <div className={activityStyles.exportConfirm} role="region" aria-label="Exportar métricas">
          <p className={activityStyles.exportText}>
            / Se va a descargar un archivo CSV con las métricas diarias {periodLabel(queryRange)}: miembros
            activos, mensajes enviados y nuevos miembros.
          </p>
          {exportMutation.isError && (
            <p className={growthStyles.errorFeedback} role="alert">
              {serverMetricsErrorMessage(exportMutation.error)}
            </p>
          )}
          <div className={activityStyles.exportActions}>
            <ActionLink onPress={() => setExportConfirmOpen(false)} disabled={exportMutation.isPending}>
              cancelar
            </ActionLink>
            <BlockButton onPress={handleConfirmExport} loading={exportMutation.isPending}>
              Descargar CSV
            </BlockButton>
          </div>
        </div>
      )}

      {period === 'custom' && (
        <form className={activityStyles.customForm} onSubmit={handleApplyCustom}>
          <label className={activityStyles.dateField}>
            Desde
            <input
              type="date"
              className={activityStyles.dateInput}
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              aria-label="Fecha desde"
            />
          </label>
          <label className={activityStyles.dateField}>
            Hasta
            <input
              type="date"
              className={activityStyles.dateInput}
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              aria-label="Fecha hasta"
            />
          </label>
          <BlockButton type="submit">Aplicar</BlockButton>
        </form>
      )}

      {validationError && <p className={growthStyles.errorFeedback}>{validationError}</p>}

      {isLoading && (
        <div data-testid="server-activity-loading">
          <Skeleton lines={3} label="Cargando métricas de actividad" />
        </div>
      )}

      {isError && !isServerMetricsForbidden(error) && (
        <div className={growthStyles.errorFeedback}>
          <p>{serverMetricsErrorMessage(error)}</p>
          <ActionLink onPress={() => void refetch()}>Reintentar</ActionLink>
        </div>
      )}

      {data && (
        <>
          {data.partial && (
            <p className={activityStyles.partialNotice} role="status">
              Algunas métricas no pudieron consultarse en este momento; mostramos los datos disponibles.
            </p>
          )}

          <div className={growthStyles.summaryCards}>
            <div className={growthStyles.card}>
              <span className={growthStyles.cardLabel}>Miembros activos</span>
              <span className={growthStyles.cardValue} data-testid="metric-active-members">
                {formatMetricValue(data.activeMembers)}
              </span>
            </div>
            <div className={growthStyles.card}>
              <span className={growthStyles.cardLabel}>Mensajes enviados</span>
              <span className={growthStyles.cardValue} data-testid="metric-messages-sent">
                {formatMetricValue(data.messagesSent)}
              </span>
            </div>
            <div className={growthStyles.card}>
              <span className={growthStyles.cardLabel}>Nuevos miembros</span>
              <span className={growthStyles.cardValue} data-testid="metric-new-members">
                {formatMetricValue(data.newMembers)}
              </span>
            </div>
          </div>

          {hasEmptyPeriod ? (
            <div className={activityStyles.emptyPanel} data-testid="server-activity-empty">
              <EmptyState
                title="No hubo actividad en el período seleccionado"
                hint="No se registraron miembros activos, mensajes enviados ni ingresos nuevos en estas fechas. Probá ampliando el período."
              />
            </div>
          ) : (
            series.length > 0 && (
              <div className={activityStyles.chartsStack}>
                <MetricTrendChart
                  title="Miembros activos"
                  ariaLabel="Miembros activos por día"
                  unitLabel="miembros activos"
                  color="#23a55a"
                  total={data.activeMembers}
                  points={series.map((p) => ({ date: p.date, value: p.activeMembers }))}
                />
                <MetricTrendChart
                  title="Mensajes enviados"
                  ariaLabel="Mensajes enviados por día"
                  unitLabel="mensajes"
                  color="#5865f2"
                  total={data.messagesSent}
                  points={series.map((p) => ({ date: p.date, value: p.messagesSent }))}
                />
                <MetricTrendChart
                  title="Nuevos miembros"
                  ariaLabel="Nuevos miembros por día"
                  unitLabel="nuevos miembros"
                  color="#f0b232"
                  total={data.newMembers}
                  points={series.map((p) => ({ date: p.date, value: p.newMembers }))}
                />
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
