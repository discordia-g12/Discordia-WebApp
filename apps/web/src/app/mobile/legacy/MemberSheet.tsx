
import { BottomSheet } from './shared';
import type { MobileShellState } from './useMobileShellState';
import styles from './MemberSheet.module.css';

/** Sección "3. MEMBER SHEET" de MobileShell. */
export function MemberSheet({ s }: { s: MobileShellState }) {
  const { onOpenModal, activeSheet, setActiveSheet, activeServer } = s;
  return (
    <BottomSheet
      isOpen={activeSheet === 'member'}
      onClose={() => setActiveSheet('none')}
      title={`Miembros del Servidor (${activeServer.members.length})`}
    >
      <div className={styles.div}>
        {/* Sección En línea */}
        <div>
          <div className={styles.lineaDiv}>
            EN LÍNEA — {activeServer.members.filter((m) => m.status !== 'offline').length}
          </div>
          <div className={styles.lineaDiv2}>
            {activeServer.members
              .filter((m) => m.status !== 'offline')
              .map((member) => (
                <div
                  key={member.id}
                  onClick={() => {
                    setActiveSheet('none');
                    onOpenModal?.('user-profile', member);
                  }}
                  className={styles.lineaDiv2Div}
                >
                  <div className={styles.lineaDiv2DivDiv}>
                    <img
                      src={member.avatarUrl || member.avatar}
                      alt={member.displayName}
                      className={styles.lineaDiv2DivDivImg}
                    />
                    <span
                      className={`status-dot ${member.status}`}
                      style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8 }}
                    />
                  </div>
                  <div>
                    <div className={styles.lineaDiv2DivDiv2}>
                      {member.displayName}
                    </div>
                    <div className={styles.lineaDiv2DivDiv3}>
                      {member.customStatus || `@${member.username}`}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Sección Desconectados */}
        <div>
          <div className={styles.desconectadosDiv}>
            DESCONECTADOS — {activeServer.members.filter((m) => m.status === 'offline').length}
          </div>
          <div className={styles.lineaDiv2}>
            {activeServer.members
              .filter((m) => m.status === 'offline')
              .map((member) => (
                <div
                  key={member.id}
                  onClick={() => {
                    setActiveSheet('none');
                    onOpenModal?.('user-profile', member);
                  }}
                  className={styles.lineaDiv2Div2}
                >
                  <img
                    src={member.avatarUrl || member.avatar}
                    alt={member.displayName}
                    className={styles.lineaDiv2DivDivImg}
                  />
                  <div>
                    <div className={styles.lineaDiv2DivDiv2}>
                      {member.displayName}
                    </div>
                    <div className={styles.lineaDiv2DivDiv3}>
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
