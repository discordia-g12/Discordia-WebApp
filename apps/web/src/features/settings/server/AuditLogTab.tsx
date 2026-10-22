
import { AuditEntry } from '../../../types';

/** Pestaña "audit-log" de ServerSettings. */
export function AuditLogTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
          Administrative Audit Log
        </h3>
        <span style={{ fontSize: 12, color: '#949ba4' }}>Showing latest actions</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[].slice(0, 15).map((entry: AuditEntry) => (
          <div
            key={entry.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: '#2b2d31',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#5865f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {entry.actor?.displayName ? entry.actor.displayName[0] : 'S'}
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#f2f3f5' }}>
                  <strong>{entry.actor?.displayName || 'Staff'}</strong> {entry.action}
                </div>
                {entry.reason && (
                  <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
                    Reason: {entry.reason}
                  </div>
                )}
              </div>
            </div>

            <div style={{ fontSize: 12, color: '#949ba4' }}>
              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
