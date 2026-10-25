import { useState } from 'react';
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useRoleMembersQuery,
  useRolesQuery,
  useSetDefaultRoleMutation,
  useUpdateRoleInfoMutation,
  useUpdateRolePermissionsMutation,
} from '../hooks/useApi';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { DEFAULT_ROLE_COLOR } from '../api/roles';
import type { Role } from '../types';

export interface RolesAdminOptions {
  /**
   * Confirmación antes de hacer un rol el de por defecto o de borrarlo (la web usa window.confirm). Sin
   * ella se hace directo: quien llama confirma antes (mobile, con su modal).
   */
  confirm?: (message: string) => boolean | Promise<boolean>;
}

/**
 * Roles del servidor para los ajustes (web y mobile): lista, el rol elegido, crear con color, borradores de
 * nombre, color y permisos (se guardan juntos con handleSaveRole), rol por defecto, borrar y los miembros
 * del rol (se piden solo al desplegarlos: un rol puede tener miles).
 */
export function useRolesAdmin(serverId: string, { confirm }: RolesAdminOptions = {}) {
  const rolesQuery = useRolesQuery(serverId);
  const createRoleMutation = useCreateRoleMutation(serverId);
  const deleteRoleMutation = useDeleteRoleMutation(serverId);
  const updatePermissionsMutation = useUpdateRolePermissionsMutation(serverId);
  const updateInfoMutation = useUpdateRoleInfoMutation(serverId);
  const setDefaultRoleMutation = useSetDefaultRoleMutation(serverId);
  const isSavingRole = updatePermissionsMutation.isPending || updateInfoMutation.isPending;
  const roles: Role[] = rolesQuery.data ?? [];

  const [activeRoleId, setActiveRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [permissionDrafts, setPermissionDrafts] = useState<Record<string, string[]>>({});
  const [infoDrafts, setInfoDrafts] = useState<Record<string, { name?: string; color?: string }>>({});
  const [roleEditError, setRoleEditError] = useState<string | null>(null);

  const activeRole: Role | undefined = roles.find((r) => r.id === activeRoleId) || roles[0];
  // La lista de miembros se pide solo al desplegarla
  const [membersExpandedRoleId, setMembersExpandedRoleId] = useState<string | null>(null);
  const isMembersExpanded = !!activeRole && membersExpandedRoleId === activeRole.id;
  const roleMembersQuery = useRoleMembersQuery(serverId, isMembersExpanded ? activeRole.id : null);
  const roleMemberProfiles = useUserProfiles(roleMembersQuery.data?.map((member) => member.userId) ?? []);
  const activeDraft = activeRole ? permissionDrafts[activeRole.id] : undefined;
  const activePermissions = activeDraft ?? activeRole?.permissions ?? [];
  const hasUnsavedPermissions =
    !!activeRole &&
    !!activeDraft &&
    (activeDraft.length !== (activeRole.permissions ?? []).length ||
      activeDraft.some((p) => !(activeRole.permissions ?? []).includes(p)));
  const activeInfoDraft = activeRole ? infoDrafts[activeRole.id] : undefined;
  const activeName = activeInfoDraft?.name ?? activeRole?.name ?? '';
  const activeColor = activeInfoDraft?.color ?? activeRole?.color ?? DEFAULT_ROLE_COLOR;
  const nameChanged = !!activeRole && activeName.trim() !== activeRole.name;
  const colorChanged = !!activeRole && activeColor !== activeRole.color;
  const hasUnsavedRole = hasUnsavedPermissions || nameChanged || colorChanged;
  const isRoleNameInvalid = nameChanged && activeName.trim().length === 0;

  const confirmed = async (message: string) => (confirm ? await confirm(message) : true);

  const handleCreateRole = async (e?: { preventDefault(): void }) => {
    e?.preventDefault();
    const name = newRoleName.trim();
    if (!name) return;
    setRoleError(null);
    try {
      const created = await createRoleMutation.mutateAsync({ name, color: newRoleColor ?? undefined });
      setNewRoleName('');
      setNewRoleColor(null);
      setActiveRoleId(created.id);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'No se pudo crear el rol.');
    }
  };

  // Activar o desactivar un permiso solo cambia el borrador: se guarda con handleSaveRole
  const handleTogglePermission = (role: Role, permissionId: string) => {
    const current = permissionDrafts[role.id] ?? role.permissions ?? [];
    const next = current.includes(permissionId) ? current.filter((p) => p !== permissionId) : [...current, permissionId];
    setRoleEditError(null);
    setPermissionDrafts((drafts) => ({ ...drafts, [role.id]: next }));
  };

  const handleChangeRoleInfo = (role: Role, changes: { name?: string; color?: string }) => {
    setRoleEditError(null);
    setInfoDrafts((drafts) => ({ ...drafts, [role.id]: { ...drafts[role.id], ...changes } }));
  };

  const discardRoleDrafts = (roleId: string) => {
    setRoleEditError(null);
    setPermissionDrafts(({ [roleId]: _discarded, ...rest }) => rest);
    setInfoDrafts(({ [roleId]: _discarded, ...rest }) => rest);
  };

  // Guarda nombre/color y permisos; cada parte limpia su borrador apenas se guarda, así un fallo no pierde lo pendiente
  const handleSaveRole = async (role: Role) => {
    setRoleEditError(null);
    try {
      if (nameChanged || colorChanged) {
        await updateInfoMutation.mutateAsync({
          roleId: role.id,
          payload: {
            ...(nameChanged && { name: activeName }),
            ...(colorChanged && { color: activeColor }),
          },
        });
        setInfoDrafts(({ [role.id]: _saved, ...rest }) => rest);
      }
      const permissionsDraft = permissionDrafts[role.id];
      if (hasUnsavedPermissions && permissionsDraft) {
        await updatePermissionsMutation.mutateAsync({ roleId: role.id, permissions: permissionsDraft });
        setPermissionDrafts(({ [role.id]: _saved, ...rest }) => rest);
      }
    } catch (err) {
      setRoleEditError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios del rol.');
    }
  };

  const handleSetDefaultRole = async (role: Role) => {
    if (role.isDefault) return;
    const ok = await confirmed(
      `¿Querés que "${role.name}" sea el rol por defecto? Los nuevos miembros lo recibirán automáticamente y el rol por defecto actual dejará de serlo.`
    );
    if (!ok) return;
    setRoleError(null);
    try {
      await setDefaultRoleMutation.mutateAsync(role.id);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'No se pudo definir el rol por defecto.');
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isDefault) return;
    const ok = await confirmed(`Estás seguro que queres borrar el rol "${role.name}"? Los miembros que lo tengan perderán sus permisos.`);
    if (!ok) return;
    setRoleError(null);
    try {
      await deleteRoleMutation.mutateAsync(role.id);
      setActiveRoleId('');
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'No se pudo eliminar el rol.');
    }
  };

  return {
    rolesQuery,
    createRoleMutation,
    deleteRoleMutation,
    updatePermissionsMutation,
    updateInfoMutation,
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
    setRoleError,
    permissionDrafts,
    setPermissionDrafts,
    infoDrafts,
    setInfoDrafts,
    roleEditError,
    setRoleEditError,
    activeRole,
    membersExpandedRoleId,
    setMembersExpandedRoleId,
    isMembersExpanded,
    roleMembersQuery,
    roleMemberProfiles,
    activeDraft,
    activePermissions,
    hasUnsavedPermissions,
    activeInfoDraft,
    activeName,
    activeColor,
    nameChanged,
    colorChanged,
    hasUnsavedRole,
    isRoleNameInvalid,
    handleCreateRole,
    handleTogglePermission,
    handleChangeRoleInfo,
    discardRoleDrafts,
    handleSaveRole,
    handleSetDefaultRole,
    handleDeleteRole,
  };
}

export type RolesAdminState = ReturnType<typeof useRolesAdmin>;
