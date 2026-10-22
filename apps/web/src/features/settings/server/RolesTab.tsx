
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
import styles from './RolesTab.module.css';

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
    <div className={styles.root}>
      {/* Roles List Sidebar */}
      <div className={styles.rolesListSidebar}>
        <form
          onSubmit={handleCreateRole}
          className={styles.rolesListSidebarForm}
        >
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder="Nombre del rol"
            maxLength={100}
            disabled={createRoleMutation.isPending}
            className={styles.nombreRol}
          />
          <div className={styles.rolesListSidebarFormDiv}>
            {PRESET_ROLE_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                title={col}
                onClick={() => setNewRoleColor(newRoleColor === col ? null : col)}
                disabled={createRoleMutation.isPending}
                className={styles.rolesListSidebarFormDivButton} style={{ borderRadius: '50%', backgroundColor: col, border: newRoleColor === col ? '2px solid var(--text-white)' : '1px solid rgba(0,0,0,0.3)' }}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={!newRoleName.trim() || createRoleMutation.isPending}
            className={styles.rolesListSidebarFormButton} style={{ cursor: !newRoleName.trim() || createRoleMutation.isPending ? 'not-allowed' : 'pointer', opacity: !newRoleName.trim() || createRoleMutation.isPending ? 0.6 : 1 }}
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
          <div className={styles.rolesListSidebarDiv}>
            {roleError}
          </div>
        )}

        <div className={styles.rolesListSidebarDiv2}>
          Roles — {roles.length}
        </div>

        {rolesQuery.isLoading && (
          <div className={styles.rolesListSidebarDiv3}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando roles...
          </div>
        )}

        {rolesQuery.isError && (
          <div className={styles.rolesListSidebarDiv4}>
            {rolesQuery.error instanceof Error ? rolesQuery.error.message : 'No se pudo cargar los roles.'}{' '}
            <button
              type="button"
              onClick={() => rolesQuery.refetch()}
              className={styles.retry}
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
              className={styles.rolesListSidebarButton} style={{ backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent', color: isSelected ? 'var(--text-white)' : 'var(--text-normal)', fontWeight: isSelected ? 600 : 400 }}
            >
              <div className={styles.rolesListSidebarButtonDiv}>
                <span
                  className={styles.rolesListSidebarButtonDivSpan} style={{ backgroundColor: r.color || '#99aab5' }}
                />
                <span className={styles.rolesListSidebarButtonDivSpan2}>
                  {r.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Role Details and Permissions Matrix */}
      {activeRole && (
        <div className={styles.rootDiv}>
          {/* Role Header */}
          <div className={styles.roleHeader}>
            <div>
              <h3 className={styles.roleHeaderH3}>
                Edit Role — {activeRole.name}
              </h3>
              <span className={styles.roleHeaderSpan}>
                Los cambios de nombre, color y permisos se aplican al presionar "Guardar cambios".
              </span>
            </div>

            {!activeRole.isDefault && (
              <div className={styles.roleHeaderDiv}>
                <button
                  type="button"
                  onClick={() => handleSetDefaultRole(activeRole)}
                  disabled={setDefaultRoleMutation.isPending}
                  className={styles.roleHeaderDivButton} style={{ cursor: setDefaultRoleMutation.isPending ? 'default' : 'pointer', opacity: setDefaultRoleMutation.isPending ? 0.6 : 1 }}
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
                    className={styles.roleHeaderDivButton2}
                  >
                    <Trash2 size={14} /> Delete Role
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Role Name & Color */}
          <div className={styles.roleNameColor}>
            <div>
              <label className={styles.roleName}>
                Role Name
              </label>
              <input
                type="text"
                value={activeName}
                onChange={(e) => handleChangeRoleInfo(activeRole, { name: e.target.value })}
                maxLength={100}
                disabled={activeRole.isDefault || isSavingRole}
                title={activeRole.isDefault ? 'El rol por defecto no se puede renombrar.' : undefined}
                className={styles.roleNameColorInput} style={{ border: `1px solid ${isRoleNameInvalid ? 'rgba(218, 55, 60, 0.6)' : 'rgba(0, 0, 0, 0.3)'}`, borderRadius: 4, opacity: activeRole.isDefault ? 0.6 : 1 }}
              />
            </div>

            <div>
              <label className={styles.roleName}>
                Role Color
              </label>
              <div className={styles.roleNameColorDiv}>
                {PRESET_ROLE_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => handleChangeRoleInfo(activeRole, { color: col })}
                    disabled={isSavingRole}
                    className={styles.roleNameColorDivButton} style={{ borderRadius: '50%', backgroundColor: col, border: activeColor === col ? '2px solid var(--text-white)' : '1px solid rgba(0,0,0,0.3)', cursor: isSavingRole ? 'default' : 'pointer' }}
                  />
                ))}
                <input
                  type="color"
                  value={activeColor}
                  onChange={(e) => handleChangeRoleInfo(activeRole, { color: e.target.value })}
                  disabled={isSavingRole}
                  className={styles.roleNameColorDivInput} style={{ cursor: isSavingRole ? 'default' : 'pointer' }}
                />
              </div>
            </div>
          </div>

          {/* Members with this role */}
          <div className={styles.membersWithThisRole}>
            <button
              type="button"
              onClick={() => setMembersExpandedRoleId(isMembersExpanded ? null : activeRole.id)}
              aria-expanded={isMembersExpanded}
              className={styles.membersWithThisRoleButton} style={{ marginBottom: isMembersExpanded ? 12 : 0 }}
            >
              {isMembersExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              Members{roleMembersQuery.data ? ` — ${roleMembersQuery.data.length}` : ''}
            </button>

            {isMembersExpanded && roleMembersQuery.isLoading && (
              <div className={styles.membersWithThisRoleDiv}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando miembros...
              </div>
            )}

            {isMembersExpanded && roleMembersQuery.isError && (
              <div className={styles.membersWithThisRoleDiv2}>
                {roleMembersQuery.error instanceof Error
                  ? roleMembersQuery.error.message
                  : 'No se pudieron cargar los miembros.'}{' '}
                <button
                  type="button"
                  onClick={() => roleMembersQuery.refetch()}
                  className={styles.reintentar}
                >
                  Reintentar
                </button>
              </div>
            )}

            {isMembersExpanded && roleMembersQuery.isSuccess && roleMembersQuery.data.length === 0 && (
              <div className={styles.ningunMiembroTieneEste}>Ningún miembro tiene este rol.</div>
            )}

            {isMembersExpanded && roleMembersQuery.isSuccess && roleMembersQuery.data.length > 0 && (
              <div className={styles.membersWithThisRoleDiv3}>
                {roleMembersQuery.data.map((member) => {
                  const displayName =
                    member.nickname || roleMemberProfiles[member.userId]?.displayName || 'Usuario';
                  return (
                    <div
                      key={member.id}
                      className={styles.membersWithThisRoleDiv3Div}
                    >
                      <div
                        className={styles.membersWithThisRoleDiv3DivDiv} style={{ backgroundColor: activeColor }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.membersWithThisRoleDiv3DivDiv2}>
                        <div className={styles.membersWithThisRoleDiv3DivDiv2Div}>
                          {displayName}
                        </div>
                      </div>
                      <span className={styles.membersWithThisRoleDiv3DivSpan}>
                        Se unió el {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Permissions Matrix */}
          <h4 className={styles.permissionsMatrix}>
            Permissions Matrix
          </h4>

          <div className={styles.rootDivDiv}>
            {PERMISSION_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <div className={styles.rootDivDivDiv}>
                  {cat.category}
                </div>

                <div className={styles.rootDivDivDiv2}>
                  {cat.permissions.map((perm) => {
                    const isEnabled = activePermissions.includes(perm.id);
                    const isSupported = perm.id in PERMISSION_BITS;
                    const isLocked = !isSupported || isSavingRole;
                    return (
                      <div
                        key={perm.id}
                        title={isSupported ? undefined : 'Este permiso todavía no está disponible en el backend.'}
                        className={styles.rootDivDivDiv2Div} style={{ opacity: isSupported ? 1 : 0.5 }}
                      >
                        <div>
                          <div className={styles.rootDivDivDiv2DivDiv}>{perm.name}</div>
                          <div className={styles.roleHeaderSpan}>{perm.desc}</div>
                        </div>

                        {/* Switch Control */}
                        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 40, height: 24, flexShrink: 0 }}>
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            disabled={isLocked}
                            onChange={() => handleTogglePermission(activeRole, perm.id)}
                            className={styles.switchControlInput}
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
                              backgroundColor: isEnabled ? 'var(--status-online)' : 'var(--status-offline)',
                              borderRadius: 24,
                              transition: '0.2s',
                            }}
                          >
                            <span
                              className={styles.switchControlSpan} style={{ left: isEnabled ? 19 : 3 }}
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
              className={styles.rootDivDiv2} style={{ border: `1px solid ${roleEditError ? 'rgba(218, 55, 60, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: 6 }}
            >
              <span className={styles.rootDivDiv2Span} style={{ color: roleEditError ? 'var(--text-danger)' : 'var(--text-normal)' }}>
                {roleEditError ?? 'Tenés cambios sin guardar.'}
              </span>
              <div className={styles.rootDivDiv2Div}>
                <button
                  type="button"
                  onClick={() => discardRoleDrafts(activeRole.id)}
                  disabled={isSavingRole}
                  className={styles.descartar} style={{ cursor: isSavingRole ? 'default' : 'pointer' }}
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveRole(activeRole)}
                  disabled={isSavingRole || !hasUnsavedRole || isRoleNameInvalid}
                  className={styles.rootDivDiv2DivButton} style={{ cursor: isSavingRole ? 'default' : 'pointer', opacity: isSavingRole || !hasUnsavedRole || isRoleNameInvalid ? 0.6 : 1 }}
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
