
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  PERMISSION_BITS,
} from '@discordia/core';
import { PERMISSION_CATEGORIES, PRESET_ROLE_COLORS } from './shared';
import type { ServerSettingsState } from './useServerSettingsState';

/** Pestaña "roles" de ServerSettings. */
export function RolesTab({ s }: { s: ServerSettingsState }) {
  const {
    rolesQuery,
    createRoleMutation,
    deleteRoleMutation,
    setDefaultRoleMutation,
    isSavingRole,
    roles,
    activeRoleId,
    setActiveRoleId,
    newRoleName,
    setNewRoleName,
    newRoleColor,
    setNewRoleColor,
    roleError,
    roleEditError,
    activeRole,
    setMembersExpandedRoleId,
    isMembersExpanded,
    roleMembersQuery,
    roleMemberProfiles,
    activePermissions,
    activeName,
    activeColor,
    hasUnsavedRole,
    isRoleNameInvalid,
    handleCreateRole,
    handleTogglePermission,
    handleChangeRoleInfo,
    discardRoleDrafts,
    handleSaveRole,
    handleSetDefaultRole,
    handleDeleteRole,
  } = s;
  return (
    <div style={{ display: 'flex', gap: 24, height: '700px' }}>
      {/* Roles List Sidebar */}
      <div
        style={{
          width: 220,
          backgroundColor: '#2b2d31',
          borderRadius: 8,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          overflowY: 'auto',
        }}
      >
        <form
          onSubmit={handleCreateRole}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}
        >
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="Nombre del rol"
            maxLength={100}
            disabled={createRoleMutation.isPending}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#1e1f22',
              color: '#dbdee1',
              border: '1px solid rgba(0, 0, 0, 0.3)',
              borderRadius: 4,
              padding: '8px 10px',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESET_ROLE_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                title={col}
                onClick={() => setNewRoleColor(newRoleColor === col ? null : col)}
                disabled={createRoleMutation.isPending}
                style={{
                  width: 20,
                  height: 20,
                  padding: 0,
                  borderRadius: '50%',
                  backgroundColor: col,
                  border: newRoleColor === col ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={!newRoleName.trim() || createRoleMutation.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: '#5865f2',
              color: '#ffffff',
              border: 'none',
              padding: '8px',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: !newRoleName.trim() || createRoleMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: !newRoleName.trim() || createRoleMutation.isPending ? 0.6 : 1,
            }}
          >
            {createRoleMutation.isPending ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creando...
              </>
            ) : (
              <>
                <Plus size={16} /> Crear rol
              </>
            )}
          </button>
        </form>

        {roleError && (
          <div
            style={{
              backgroundColor: 'rgba(218, 55, 60, 0.15)',
              border: '1px solid rgba(218, 55, 60, 0.3)',
              color: '#fa777c',
              borderRadius: 4,
              padding: '6px 8px',
              fontSize: 12,
              marginBottom: 8,
            }}
          >
            {roleError}
          </div>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, color: '#949ba4', textTransform: 'uppercase', margin: '4px 6px' }}>
          Roles — {roles.length}
        </div>

        {rolesQuery.isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#949ba4', fontSize: 12, padding: '8px 6px' }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando roles...
          </div>
        )}

        {rolesQuery.isError && (
          <div
            style={{
              backgroundColor: 'rgba(218, 55, 60, 0.15)',
              border: '1px solid rgba(218, 55, 60, 0.3)',
              color: '#fa777c',
              borderRadius: 4,
              padding: '6px 8px',
              fontSize: 12,
            }}
          >
            {rolesQuery.error instanceof Error ? rolesQuery.error.message : 'No se pudo cargar los roles.'}{' '}
            <button
              type="button"
              onClick={() => rolesQuery.refetch()}
              style={{ background: 'none', border: 'none', color: '#fa777c', textDecoration: 'underline', cursor: 'pointer', fontSize: 12, padding: 0 }}
            >
              Retry
            </button>
          </div>
        )}

        {roles.map((r) => {
          const isSelected = r.id === activeRoleId;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveRoleId(r.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: isSelected ? '#ffffff' : '#dbdee1',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
                fontWeight: isSelected ? 600 : 400,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: r.color || '#99aab5',
                  }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                  {r.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Role Details and Permissions Matrix */}
      {activeRole && (
        <div
          style={{
            flex: 1,
            backgroundColor: '#2b2d31',
            borderRadius: 8,
            padding: '24px',
            overflowY: 'auto',
          }}
        >
          {/* Role Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 16,
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: 20,
            }}
          >
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f2f3f5', margin: '0 0 4px 0' }}>
                Edit Role — {activeRole.name}
              </h3>
              <span style={{ fontSize: 12, color: '#949ba4' }}>
                Los cambios de nombre, color y permisos se aplican al presionar "Guardar cambios".
              </span>
            </div>

            {!activeRole.isDefault && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => handleSetDefaultRole(activeRole)}
                  disabled={setDefaultRoleMutation.isPending}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(88, 101, 242, 0.15)',
                    color: '#949cf7',
                    border: '1px solid rgba(88, 101, 242, 0.3)',
                    padding: '6px 12px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: setDefaultRoleMutation.isPending ? 'default' : 'pointer',
                    opacity: setDefaultRoleMutation.isPending ? 0.6 : 1,
                  }}
                >
                  {setDefaultRoleMutation.isPending && (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  )}
                  Set as default
                </button>

                {roles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRole(activeRole)}
                    disabled={deleteRoleMutation.isPending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: 'rgba(218, 55, 60, 0.15)',
                      color: '#fa777c',
                      border: '1px solid rgba(218, 55, 60, 0.3)',
                      padding: '6px 12px',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={14} /> Delete Role
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Role Name & Color */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                Role Name
              </label>
              <input
                type="text"
                value={activeName}
                onChange={(e) => handleChangeRoleInfo(activeRole, { name: e.target.value })}
                maxLength={100}
                disabled={activeRole.isDefault || isSavingRole}
                title={activeRole.isDefault ? 'El rol por defecto no se puede renombrar.' : undefined}
                style={{
                  width: '100%',
                  backgroundColor: '#1e1f22',
                  color: '#dbdee1',
                  border: `1px solid ${isRoleNameInvalid ? 'rgba(218, 55, 60, 0.6)' : 'rgba(0, 0, 0, 0.3)'}`,
                  borderRadius: 4,
                  padding: '8px 10px',
                  fontSize: 14,
                  outline: 'none',
                  opacity: activeRole.isDefault ? 0.6 : 1,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                Role Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {PRESET_ROLE_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => handleChangeRoleInfo(activeRole, { color: col })}
                    disabled={isSavingRole}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: col,
                      border: activeColor === col ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                      cursor: isSavingRole ? 'default' : 'pointer',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={activeColor}
                  onChange={(e) => handleChangeRoleInfo(activeRole, { color: e.target.value })}
                  disabled={isSavingRole}
                  style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: isSavingRole ? 'default' : 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Members with this role */}
          <div style={{ marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => setMembersExpandedRoleId(isMembersExpanded ? null : activeRole.id)}
              aria-expanded={isMembersExpanded}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                padding: 0,
                marginBottom: isMembersExpanded ? 12 : 0,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#f2f3f5',
              }}
            >
              {isMembersExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Members{roleMembersQuery.data ? ` — ${roleMembersQuery.data.length}` : ''}
            </button>

            {isMembersExpanded && roleMembersQuery.isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#949ba4', fontSize: 13 }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando miembros...
              </div>
            )}

            {isMembersExpanded && roleMembersQuery.isError && (
              <div style={{ fontSize: 13, color: '#fa777c' }}>
                {roleMembersQuery.error instanceof Error
                  ? roleMembersQuery.error.message
                  : 'No se pudieron cargar los miembros.'}{' '}
                <button
                  type="button"
                  onClick={() => roleMembersQuery.refetch()}
                  style={{ background: 'none', border: 'none', color: '#00a8fc', cursor: 'pointer', padding: 0, fontSize: 13 }}
                >
                  Reintentar
                </button>
              </div>
            )}

            {isMembersExpanded && roleMembersQuery.isSuccess && roleMembersQuery.data.length === 0 && (
              <div style={{ fontSize: 13, color: '#949ba4' }}>Ningún miembro tiene este rol.</div>
            )}

            {isMembersExpanded && roleMembersQuery.isSuccess && roleMembersQuery.data.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                {roleMembersQuery.data.map((member) => {
                  const displayName =
                    member.nickname || roleMemberProfiles[member.userId]?.displayName || 'Usuario';
                  return (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        backgroundColor: '#1e1f22',
                        borderRadius: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: activeColor,
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#f2f3f5',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {displayName}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: '#949ba4', flexShrink: 0 }}>
                        Se unió el {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Permissions Matrix */}
          <h4 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#f2f3f5', marginBottom: 16 }}>
            Permissions Matrix
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {PERMISSION_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#5865f2', marginBottom: 10 }}>
                  {cat.category}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cat.permissions.map((perm) => {
                    const isEnabled = activePermissions.includes(perm.id);
                    const isSupported = perm.id in PERMISSION_BITS;
                    const isLocked = !isSupported || isSavingRole;
                    return (
                      <div
                        key={perm.id}
                        title={isSupported ? undefined : 'Este permiso todavía no está disponible en el backend.'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: '#1e1f22',
                          borderRadius: 6,
                          opacity: isSupported ? 1 : 0.5,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f2f3f5' }}>{perm.name}</div>
                          <div style={{ fontSize: 12, color: '#949ba4' }}>{perm.desc}</div>
                        </div>

                        {/* Switch Control */}
                        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 40, height: 24, flexShrink: 0 }}>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            disabled={isLocked}
                            onChange={() => handleTogglePermission(activeRole, perm.id)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span
                            className="slider"
                            style={{
                              position: 'absolute',
                              cursor: isLocked ? 'default' : 'pointer',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: isEnabled ? '#23a55a' : '#80848e',
                              borderRadius: 24,
                              transition: '0.2s',
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                height: 18,
                                width: 18,
                                left: isEnabled ? 19 : 3,
                                bottom: 3,
                                backgroundColor: '#ffffff',
                                borderRadius: '50%',
                                transition: '0.2s',
                              }}
                            />
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {(hasUnsavedRole || roleEditError) && (
            <div
              style={{
                position: 'sticky',
                bottom: 0,
                marginTop: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 14px',
                backgroundColor: '#111214',
                border: `1px solid ${roleEditError ? 'rgba(218, 55, 60, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: 6,
              }}
            >
              <span style={{ fontSize: 13, color: roleEditError ? '#fa777c' : '#dbdee1' }}>
                {roleEditError ?? 'Tenés cambios sin guardar.'}
              </span>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => discardRoleDrafts(activeRole.id)}
                  disabled={isSavingRole}
                  style={{
                    background: 'transparent',
                    color: '#dbdee1',
                    border: 'none',
                    fontSize: 13,
                    cursor: isSavingRole ? 'default' : 'pointer',
                    padding: '6px 12px',
                  }}
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveRole(activeRole)}
                  disabled={isSavingRole || !hasUnsavedRole || isRoleNameInvalid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#23a55a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '6px 14px',
                    cursor: isSavingRole ? 'default' : 'pointer',
                    opacity: isSavingRole || !hasUnsavedRole || isRoleNameInvalid ? 0.6 : 1,
                  }}
                >
                  {isSavingRole && (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  )}
                  Guardar cambios
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
