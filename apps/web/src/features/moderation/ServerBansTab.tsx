import React from 'react';
import { Loader2, Search } from 'lucide-react';
import { useServerBansAdmin } from './useServerBansAdmin';
import styles from './ServerBansTab.module.css';

export interface ServerBansTabProps {
  serverId: string;
}

/**
 * Pestaña de baneos de Server Settings: lista los usuarios baneados y permite revocar
 * el baneo para que puedan volver a unirse con una invitación. Requiere BAN_MEMBERS;
 * el backend es quien valida el permiso.
 */
export const ServerBansTab: React.FC<ServerBansTabProps> = ({ serverId }) => {
  const {
    bansQuery,
    unbanMutation,
    search,
    setSearch,
    confirmUserId,
    setConfirmUserId,
    error,
    notice,
    bans,
    displayName,
    filteredBans,
    isForbidden,
    handleUnban,
  } = useServerBansAdmin(serverId);

  return (
    <div className={styles.root}>
      <div className={styles.rootDiv}>
        <div className={styles.rootDivDiv}>
          Bans{bansQuery.data ? ` (${bans.length})` : ''}
        </div>

        <div className={styles.rootDivDiv2}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bans..."
            className={styles.searchBans}
          />
        </div>
      </div>

      {error && (
        <div className={styles.rootDiv2}>
          {error}
        </div>
      )}

      {notice && (
        <div className={styles.rootDiv3}>
          {notice}
        </div>
      )}

      {bansQuery.isLoading && (
        <div className={styles.rootDiv4}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando baneos...
        </div>
      )}

      {bansQuery.isError && (
        <div className={styles.rootDiv5}>
          {isForbidden ? (
            'Necesitás el permiso "Ban Members" para ver y revocar los baneos de este servidor.'
          ) : (
            <>
              No se pudieron cargar los baneos.{' '}
              <button
                type="button"
                onClick={() => bansQuery.refetch()}
                className={styles.reintentar}
              >
                Reintentar
              </button>
            </>
          )}
        </div>
      )}

      {bansQuery.isSuccess && (
        <div className={styles.rootDiv6}>
          {filteredBans.length === 0 && (
            <div className={styles.rootDiv6Div}>
              {search.trim() ? 'Ningún usuario baneado coincide con la búsqueda.' : 'No hay usuarios baneados en este servidor.'}
            </div>
          )}

          {filteredBans.map((ban) => {
            const name = displayName(ban);
            const isConfirming = confirmUserId === ban.userId;

            return (
              <div
                key={ban.id}
                className={styles.rootDiv6Div2}
              >
                <div className={styles.rootDiv6Div2Div}>
                  <div className={styles.rootDiv6Div2DivDiv}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.rootDiv6Div2DivDiv2}>
                    <span className={styles.rootDiv6Div2DivDiv2Span}>
                      {name}
                    </span>
                    <span className={styles.rootDiv6Div2DivDiv2Span2}>
                      {ban.reason ? `Motivo: ${ban.reason}` : 'Sin motivo'} ·{' '}
                      {new Date(ban.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className={styles.rootDiv6Div2Div2}>
                  {isConfirming ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmUserId(null)}
                        className={styles.cancelar}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnban(ban)}
                        disabled={unbanMutation.isPending}
                        className={styles.confirmar} style={{ cursor: unbanMutation.isPending ? 'default' : 'pointer' }}
                      >
                        Confirmar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmUserId(ban.userId)}
                      disabled={unbanMutation.isPending}
                      title={`Revocar el baneo de ${name}`}
                      className={styles.revocarBaneo} style={{ cursor: unbanMutation.isPending ? 'default' : 'pointer' }}
                    >
                      Revocar baneo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ServerBansTab;
