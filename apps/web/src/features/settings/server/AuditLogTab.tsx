
import { AuditEntry } from '../../../types';
import styles from './AuditLogTab.module.css';

/** Pestaña "audit-log" de ServerSettings. */
export function AuditLogTab() {
  return (
    <div className={styles.root}>
      <div className={styles.rootDiv}>
        <h3 className={styles.administrativeAuditLog}>
          Administrative Audit Log
        </h3>
        <span className={styles.showingLatestActions}>Showing latest actions</span>
      </div>

      <div className={styles.rootDiv2}>
        {[].slice(0, 15).map((entry: AuditEntry) => (
          <div
            key={entry.id}
            className={styles.rootDiv2Div}
          >
            <div className={styles.rootDiv2DivDiv}>
              <div className={styles.rootDiv2DivDivDiv}>
                {entry.actor?.displayName ? entry.actor.displayName[0] : 'S'}
              </div>
              <div>
                <div className={styles.rootDiv2DivDivDiv2}>
                  <strong>{entry.actor?.displayName || 'Staff'}</strong> {entry.action}
                </div>
                {entry.reason && (
                  <div className={styles.rootDiv2DivDivDiv3}>
                    Reason: {entry.reason}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.showingLatestActions}>
              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
