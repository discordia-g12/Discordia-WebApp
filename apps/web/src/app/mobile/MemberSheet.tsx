
import { BottomSheet } from './shared';
import type { MobileShellState } from './useMobileShellState';

/** Sección "3. MEMBER SHEET" de MobileShell. */
export function MemberSheet({ s }: { s: MobileShellState }) {
  const { onOpenModal, activeSheet, setActiveSheet, activeServer } = s;
  return (
    <BottomSheet
      isOpen={activeSheet === 'member'}
      onClose={() => setActiveSheet('none')}
      title={`Miembros del Servidor (${activeServer.members.length})`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Sección En línea */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-positive)', marginBottom: 8, textTransform: 'uppercase' }}>
            EN LÍNEA — {activeServer.members.filter((m) => m.status !== 'offline').length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeServer.members
              .filter((m) => m.status !== 'offline')
              .map((member) => (
                <div
                  key={member.id}
                  onClick={() => {
                    setActiveSheet('none');
                    onOpenModal?.('user-profile', member);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <img
                      src={member.avatarUrl || member.avatar}
                      alt={member.displayName}
                      style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                    />
                    <span
                      className={`status-dot ${member.status}`}
                      style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8 }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--header-primary)' }}>
                      {member.displayName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {member.customStatus || `@${member.username}`}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Sección Desconectados */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
            DESCONECTADOS — {activeServer.members.filter((m) => m.status === 'offline').length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeServer.members
              .filter((m) => m.status === 'offline')
              .map((member) => (
                <div
                  key={member.id}
                  onClick={() => {
                    setActiveSheet('none');
                    onOpenModal?.('user-profile', member);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    opacity: 0.7,
                  }}
                >
                  <img
                    src={member.avatarUrl || member.avatar}
                    alt={member.displayName}
                    style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--header-primary)' }}>
                      {member.displayName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      @{member.username}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
