import React, { useState } from 'react';
import { Server, Role, Channel, User, ChannelType } from '../../../types';
import {
  useRolesQuery,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useUpdateRolePermissionsMutation,
  useUpdateRoleInfoMutation,
  useSetDefaultRoleMutation,
  useRoleMembersQuery,
  useUserProfiles,
} from '@discordia/core';
import { TabType } from './shared';
import type { ServerSettingsProps } from '../ServerSettings';

/** Estado y handlers de ServerSettings: viven en el componente y lo comparten todas sus pestañas. */
export function useServerSettingsState(props: ServerSettingsProps) {
  const {
    server: initialServer,
    currentUser: initialUser,
    onClose,
    onUpdateServer,
  } = props;
  const currentServer = initialServer || null as any;
  const user = initialUser || ({ id: '' } as any);

  const [serverState, setServerState] = useState<Server>({ ...currentServer });
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Overview Tab States
  const [serverName, setServerName] = useState(serverState.name);
  const [serverDescription, setServerDescription] = useState(serverState.description || '');
  const [serverIcon, setServerIcon] = useState(serverState.iconUrl || serverState.icon || '');

  // Roles Tab States (datos reales de Server-Roles-Core-Service)
  const rolesQuery = useRolesQuery(serverState.id);
  const createRoleMutation = useCreateRoleMutation(serverState.id);
  const deleteRoleMutation = useDeleteRoleMutation(serverState.id);
  const updatePermissionsMutation = useUpdateRolePermissionsMutation(serverState.id);
  const updateInfoMutation = useUpdateRoleInfoMutation(serverState.id);
  const setDefaultRoleMutation = useSetDefaultRoleMutation(serverState.id);
  const isSavingRole = updatePermissionsMutation.isPending || updateInfoMutation.isPending;
  const roles: Role[] = rolesQuery.data ?? [];
  const [activeRoleId, setActiveRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [permissionDrafts, setPermissionDrafts] = useState<Record<string, string[]>>({});
  const [infoDrafts, setInfoDrafts] = useState<Record<string, { name?: string; color?: string }>>({});
  const [roleEditError, setRoleEditError] = useState<string | null>(null);

  // Members Tab States
  const [members] = useState<User[]>(serverState.members || []);

  // Channels Tab States
  const [categories, setCategories] = useState(serverState.categories || []);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChannelType>('text');
  const [newChannelCategory, setNewChannelCategory] = useState(categories[0]?.id || 'cat-text');

  // Moderation Tab States
  const [explicitFilter, setExplicitFilter] = useState(true);
  const [spamFilter, setSpamFilter] = useState(true);
  const [requireEmail, setRequireEmail] = useState(true);
  const [require2FA, setRequire2FA] = useState(false);
  const [blockedWords, setBlockedWords] = useState('scam, phishing, free-nitro-link, malware');

  // Notifications Tab States
  const [notifPreference, setNotifPreference] = useState<'all' | 'mentions' | 'nothing'>('mentions');
  const [isServerMuted, setIsServerMuted] = useState(false);
  const [muteDuration, setMuteDuration] = useState('until_turn_on');
  const [suppressEveryone, setSuppressEveryone] = useState(false);

  // Emojis Tab States
  const [customEmojis, setCustomEmojis] = useState([
    { id: 'e1', name: 'kekw', url: '' },
    { id: 'e2', name: 'discordia_cat', url: '' },
    { id: 'e3', name: 'pepe_hype', url: '' },
  ]);

  // Boost Tab States
  const [userPoints, setUserPoints] = useState<number>(user.points ?? 840);
  const [userBoostedCount, setUserBoostedCount] = useState<number>(1);
  const [boostFeedback, setBoostFeedback] = useState<string | null>(null);

  // Active Role Object
  const activeRole = roles.find((r) => r.id === activeRoleId) || roles[0];
  // La lista de miembros se pide solo al desplegarla: un rol puede tener miles de miembros
  const [membersExpandedRoleId, setMembersExpandedRoleId] = useState<string | null>(null);
  const isMembersExpanded = !!activeRole && membersExpandedRoleId === activeRole.id;
  const roleMembersQuery = useRoleMembersQuery(serverState.id, isMembersExpanded ? activeRole.id : null);
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
  const activeColor = activeInfoDraft?.color ?? activeRole?.color ?? '#99aab5';
  const nameChanged = !!activeRole && activeName.trim() !== activeRole.name;
  const colorChanged = !!activeRole && activeColor !== activeRole.color;
  const hasUnsavedRole = hasUnsavedPermissions || nameChanged || colorChanged;
  const isRoleNameInvalid = nameChanged && activeName.trim().length === 0;

  // Icon upload handler
  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El ícono tiene que pesar menos de 5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setServerIcon(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save server overview handler
  const handleSaveOverview = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      const updated: Server = {
        ...serverState,
        name: serverName,
        description: serverDescription,
        icon: serverIcon,
        iconUrl: serverIcon,
        roles,
        categories,
        members,
      };
      setServerState(updated);
      onUpdateServer?.(updated);
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 600);
  };

  // Create new role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
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

  // Toggle a permission: solo modifica el borrador, se guarda con el botón "Guardar cambios"
  const handleTogglePermission = (role: Role, permissionId: string) => {
    const current = permissionDrafts[role.id] ?? role.permissions ?? [];
    const next = current.includes(permissionId)
      ? current.filter((p) => p !== permissionId)
      : [...current, permissionId];
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

  // Set default role
  const handleSetDefaultRole = async (role: Role) => {
    if (role.isDefault) return;
    const confirmed = window.confirm(
      `¿Querés que "${role.name}" sea el rol por defecto? Los nuevos miembros lo recibirán automáticamente y el rol por defecto actual dejará de serlo.`
    );
    if (!confirmed) return;
    setRoleError(null);
    try {
      await setDefaultRoleMutation.mutateAsync(role.id);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'No se pudo definir el rol por defecto.');
    }
  };

  // Delete role
  const handleDeleteRole = async (role: Role) => {
    if (role.isDefault) return;
    const confirmed = window.confirm(
      `Estás seguro que queres borrar el rol "${role.name}"? Los miembros que lo tengan perderán sus permisos.`
    );
    if (!confirmed) return;
    setRoleError(null);
    try {
      await deleteRoleMutation.mutateAsync(role.id);
      setActiveRoleId('');
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'No se pudo eliminar el rol.');
    }
  };

  // Create channel handler
  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const channelToAdd: Channel = {
      id: `c-${Date.now()}`,
      serverId: serverState.id,
      name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
      type: newChannelType,
      categoryId: newChannelCategory,
    };

    const updatedCategories = categories.map((cat) => {
      if (cat.id === newChannelCategory) {
        return {
          ...cat,
          channels: [...cat.channels, channelToAdd],
        };
      }
      return cat;
    });

    setCategories(updatedCategories);
    setNewChannelName('');
    setShowCreateChannelModal(false);
  };

  // Delete channel
  const handleDeleteChannel = (catId: string, chanId: string) => {
    const confirmed = window.confirm('¿Eliminar este canal?');
    if (!confirmed) return;

    const updatedCategories = categories.map((cat) => {
      if (cat.id === catId) {
        return {
          ...cat,
          channels: cat.channels.filter((ch) => ch.id !== chanId),
        };
      }
      return cat;
    });
    setCategories(updatedCategories);
  };

  // Upload emoji
  const handleEmojiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El emoji tiene que pesar menos de 5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newEmoji = {
            id: `emoji-${Date.now()}`,
            name: file.name.split('.')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
            url: event.target.result as string,
          };
          setCustomEmojis([...customEmojis, newEmoji]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Boost Server
  const handleBoostServer = () => {
    const BOOST_COST = 500;
    if (userPoints < BOOST_COST) {
      setBoostFeedback('No te alcanzan los puntos: comprá más en Ajustes → Factura.');
      return;
    }

    setUserPoints((prev) => prev - BOOST_COST);
    setUserBoostedCount((prev) => prev + 1);

    const newBoostCount = serverState.boostCount + 1;
    let newLevel = 0;
    if (newBoostCount >= 7) newLevel = 3;
    else if (newBoostCount >= 4) newLevel = 2;
    else if (newBoostCount >= 2) newLevel = 1;

    setServerState((prev) => ({
      ...prev,
      boostCount: newBoostCount,
      boostLevel: newLevel,
    }));

    setBoostFeedback('Mejoraste el servidor. ¡Gracias!');
    setTimeout(() => setBoostFeedback(null), 4000);
  };

  // Retract Boost
  const handleRetractBoost = () => {
    if (userBoostedCount <= 0 || serverState.boostCount <= 0) return;
    setUserBoostedCount((prev) => prev - 1);
    setUserPoints((prev) => prev + 500);

    const newBoostCount = Math.max(0, serverState.boostCount - 1);
    let newLevel = 0;
    if (newBoostCount >= 7) newLevel = 3;
    else if (newBoostCount >= 4) newLevel = 2;
    else if (newBoostCount >= 2) newLevel = 1;

    setServerState((prev) => ({
      ...prev,
      boostCount: newBoostCount,
      boostLevel: newLevel,
    }));

    setBoostFeedback('Retiraste la mejora: te devolvimos 500 puntos.');
    setTimeout(() => setBoostFeedback(null), 4000);
  };

  return {

    initialServer,
    initialUser,
    onClose,
    onUpdateServer,
    currentServer,
    user,
    serverState,
    setServerState,
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    isSaving,
    setIsSaving,
    saveSuccess,
    setSaveSuccess,
    serverName,
    setServerName,
    serverDescription,
    setServerDescription,
    serverIcon,
    setServerIcon,
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
    members,
    categories,
    setCategories,
    showCreateChannelModal,
    setShowCreateChannelModal,
    newChannelName,
    setNewChannelName,
    newChannelType,
    setNewChannelType,
    newChannelCategory,
    setNewChannelCategory,
    explicitFilter,
    setExplicitFilter,
    spamFilter,
    setSpamFilter,
    requireEmail,
    setRequireEmail,
    require2FA,
    setRequire2FA,
    blockedWords,
    setBlockedWords,
    notifPreference,
    setNotifPreference,
    isServerMuted,
    setIsServerMuted,
    muteDuration,
    setMuteDuration,
    suppressEveryone,
    setSuppressEveryone,
    customEmojis,
    setCustomEmojis,
    userPoints,
    setUserPoints,
    userBoostedCount,
    setUserBoostedCount,
    boostFeedback,
    setBoostFeedback,
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
    handleIconUpload,
    handleSaveOverview,
    handleCreateRole,
    handleTogglePermission,
    handleChangeRoleInfo,
    discardRoleDrafts,
    handleSaveRole,
    handleSetDefaultRole,
    handleDeleteRole,
    handleCreateChannel,
    handleDeleteChannel,
    handleEmojiUpload,
    handleBoostServer,
    handleRetractBoost,
  };
}

export type ServerSettingsState = ReturnType<typeof useServerSettingsState>;
