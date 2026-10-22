import React, { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useServerBansQuery, useUnbanMemberMutation } from '../api/hooks/useApi';
import { useUserProfiles } from '../api/hooks/useUserProfiles';
import { ApiError, unbanErrorMessage } from '@discordia/core';
import type { ServerBan } from '../types';

export interface ServerBansTabProps {
  serverId: string;
}

/**
 * Pestaña de baneos de Server Settings: lista los usuarios baneados y permite revocar
 * el baneo para que puedan volver a unirse con una invitación. Requiere BAN_MEMBERS;
 * el backend es quien valida el permiso.
 */
export const ServerBansTab: React.FC<ServerBansTabProps> = ({ serverId }) => {
  const bansQuery = useServerBansQuery(serverId);
  const unbanMutation = useUnbanMemberMutation(serverId);

  const [search, setSearch] = useState('');
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const bans: ServerBan[] = bansQuery.data ?? [];
  const profiles = useUserProfiles(bans.map((ban) => ban.userId));

  const displayName = (ban: ServerBan) => profiles[ban.userId]?.displayName || 'Usuario';

  const filteredBans = bans.filter((ban) =>
    displayName(ban).toLowerCase().includes(search.trim().toLowerCase())
  );

  const isForbidden = bansQuery.error instanceof ApiError && bansQuery.error.status === 403;

  const handleUnban = async (ban: ServerBan) => {
    setError(null);
    setNotice(null);
    setConfirmUserId(null);
    try {
      await unbanMutation.mutateAsync(ban.userId);
      setNotice(`Se revocó el baneo de ${displayName(ban)}. Ya puede volver a unirse con una invitación.`);
    } catch (err) {
      setError(unbanErrorMessage(err));
      // Si otro moderador ya lo desbaneó, la lista quedó desactualizada
      if (err instanceof ApiError && err.status === 404) bansQuery.refetch();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f3f5' }}>
          Bans{bansQuery.data ? ` (${bans.length})` : ''}
        </div>

        <div style={{ position: 'relative', width: 260 }}>
          <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#949ba4' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bans..."
            style={{
              width: '100%',
              backgroundColor: '#1e1f22',
              color: '#dbdee1',
              border: '1px solid rgba(0, 0, 0, 0.3)',
              borderRadius: 4,
              padding: '8px 12px 8px 34px',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: 'rgba(218, 55, 60, 0.15)',
            border: '1px solid rgba(218, 55, 60, 0.3)',
            color: '#fa777c',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          style={{
            backgroundColor: 'rgba(35, 165, 90, 0.15)',
            border: '1px solid rgba(35, 165, 90, 0.3)',
            color: '#57f287',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: 12,
          }}
        >
          {notice}
        </div>
      )}

      {bansQuery.isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#949ba4', fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando baneos...
        </div>
      )}

      {bansQuery.isError && (
        <div style={{ fontSize: 13, color: '#fa777c' }}>
          {isForbidden ? (
            'Necesitás el permiso "Ban Members" para ver y revocar los baneos de este servidor.'
          ) : (
            <>
              No se pudieron cargar los baneos.{' '}
              <button
                type="button"
                onClick={() => bansQuery.refetch()}
                style={{ background: 'none', border: 'none', color: '#00a8fc', cursor: 'pointer', padding: 0, fontSize: 13 }}
              >
                Reintentar
              </button>
            </>
          )}
        </div>
      )}

      {bansQuery.isSuccess && (
        <div style={{ backgroundColor: '#2b2d31', borderRadius: 8, maxHeight: 520, overflowY: 'auto' }}>
          {filteredBans.length === 0 && (
            <div style={{ padding: 16, fontSize: 13, color: '#949ba4' }}>
              {search.trim() ? 'Ningún usuario baneado coincide con la búsqueda.' : 'No hay usuarios baneados en este servidor.'}
            </div>
          )}

          {filteredBans.map((ban) => {
            const name = displayName(ban);
            const isConfirming = confirmUserId === ban.userId;

            return (
              <div
                key={ban.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: '#4e5058',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#f2f3f5',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {name}
                    </span>
                    <span style={{ fontSize: 12, color: '#949ba4' }}>
                      {ban.reason ? `Motivo: ${ban.reason}` : 'Sin motivo'} ·{' '}
                      {new Date(ban.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {isConfirming ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmUserId(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dbdee1',
                          cursor: 'pointer',
                          fontSize: 13,
                          padding: '6px 10px',
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnban(ban)}
                        disabled={unbanMutation.isPending}
                        style={{
                          backgroundColor: '#da373c',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 4,
                          padding: '6px 12px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: unbanMutation.isPending ? 'default' : 'pointer',
                        }}
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
                      style={{
                        backgroundColor: 'transparent',
                        color: '#dbdee1',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 4,
                        padding: '6px 12px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: unbanMutation.isPending ? 'default' : 'pointer',
                      }}
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
