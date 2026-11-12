import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { EmptyState } from '@web/ui';
import styles from './blocks.module.css';

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
}

/**
 * Listado del backoffice: tabla entre líneas finas. Sin filas muestra el estado vacío (hoy, mientras el
 * listado no tiene endpoint; después, cuando la búsqueda no encuentra nada).
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: { title: string; hint?: string };
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                <EmptyState title={empty.title} hint={empty.hint} />
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key}>{c.render(row)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Cifras grandes con su etiqueta chica (métricas y resumen del expediente). Sin dato: "—". hint aclara qué
 * cuenta la cifra, en chico debajo.
 */
export function StatGrid({ stats }: { stats: { label: string; value?: ReactNode; hint?: string }[] }) {
  return (
    <dl className={styles.stats}>
      {stats.map((s) => (
        <div key={s.label}>
          <dt>{s.label}</dt>
          <dd>{s.value ?? '—'}</dd>
          {s.hint && <dd className={styles.statHint}>/ {s.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Ficha de datos: etiqueta a la izquierda, valor a la derecha, entre líneas finas. Sin dato: "—". */
export function FieldList({ fields }: { fields: { label: string; value?: ReactNode }[] }) {
  return (
    <dl className={styles.fields}>
      {fields.map((f) => (
        <div key={f.label}>
          <dt>{f.label}</dt>
          <dd>{f.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Link a otro sitio (Grafana, la web): se abre en otra pestaña, sin pasarle esta página. */
export function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a className={styles.externalLink} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
      <span className={styles.srOnly}> (se abre en otra pestaña)</span>
    </a>
  );
}

/** Comando para copiar (monoespaciado, con borde fino). */
export function Command({ children }: { children: string }) {
  return (
    <pre className={styles.command}>
      <code>{children}</code>
    </pre>
  );
}

/** Opciones que se pueden marcar varias (servicios afectados de un incidente). */
export function CheckList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (value: T[]) => void;
}) {
  const toggle = (option: T) => onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  return (
    <fieldset className={styles.checkList}>
      <legend>{label}</legend>
      {options.map((o) => (
        <label key={o.value}>
          <input type="checkbox" checked={value.includes(o.value)} onChange={() => toggle(o.value)} />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}

/** Texto largo (descripción de un incidente), con el subrayado de UnderlineInput. */
export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className={styles.textArea}>
      <span>{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} rows={3} />
    </label>
  );
}
