import { formatAuditChanges } from '@discordia/core';
import styles from './AuditLogViewer.module.css';

interface AuditLogDiffProps {
  changes?: Record<string, unknown> | null;
}

export function AuditLogDiff({ changes }: AuditLogDiffProps) {
  const diffs = formatAuditChanges(changes);

  if (diffs.length === 0) {
    return null;
  }

  return (
    <div className={styles.diffContainer} role="region" aria-label="Detalles de los cambios">
      <table className={styles.diffTable}>
        <tbody>
          {diffs.map((diff) => (
            <tr key={diff.key}>
              <td className={styles.diffKey}>{diff.label}</td>
              <td className={styles.diffValues}>
                <span className={styles.diffOld}>{diff.oldVal}</span>
                <span className={styles.diffArrow} aria-hidden="true">
                  →
                </span>
                <span className={styles.diffNew}>{diff.newVal}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
