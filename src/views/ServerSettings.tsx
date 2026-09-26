import React, { useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Hash,
  Volume2,
  Shield,
  Users,
  Bell,
  Sparkles,
  Flame,
  Plus,
  Trash2,
  Edit3,
  Crown,
  Search,
  Check,
  Loader2,
  Sliders,
  FileText,
  Smile,
} from 'lucide-react';
import { Server, Role, Channel, User, AuditEntry, ChannelType } from '../types';
import { SERVERS, USERS, CURRENT_USER_ID, AUDIT_LOG } from '../data/mock';
import {
  useRolesQuery,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useUpdateRolePermissionsMutation,
} from '../api/hooks/useApi';
import { PERMISSION_BITS } from '../api/roles';

export interface ServerSettingsProps {
  server?: Server;
  currentUser?: User;
  onClose?: () => void;
  onUpdateServer?: (updatedServer: Server) => void;
}

type TabType =
  | 'overview'
  | 'roles'
  | 'emojis'
  | 'boost'
  | 'channels'
  | 'moderation'
  | 'audit-log'
  | 'members'
  | 'notifications';

const PERMISSION_CATEGORIES = [
  {
    category: 'General Server Permissions',
    permissions: [
      { id: 'ADMINISTRATOR', name: 'Administrator', desc: 'Grants all permissions and bypasses channel overrides.' },
      { id: 'MANAGE_SERVER', name: 'Manage Server', desc: 'Change server name, region, icon and vanity URL.' },
      { id: 'MANAGE_ROLES', name: 'Manage Roles', desc: 'Create, edit and delete roles lower than this one.' },
      { id: 'MANAGE_CHANNELS', name: 'Manage Channels', desc: 'Create, organize and delete channels in this server.' },
      { id: 'VIEW_AUDIT_LOG', name: 'View Audit Log', desc: 'View administrative actions executed in this server.' },
    ],
  },
  {
    category: 'Membership Permissions',
    permissions: [
      { id: 'CREATE_INSTANT_INVITE', name: 'Create Invite', desc: 'Create permanent and temporary invite links.' },
      { id: 'KICK_MEMBERS', name: 'Kick Members', desc: 'Remove members from this server with optional reason.' },
      { id: 'BAN_MEMBERS', name: 'Ban Members', desc: 'Permanently ban accounts and delete recent messages.' },
      { id: 'CHANGE_NICKNAME', name: 'Change Nickname', desc: 'Allow members to customize their server nickname.' },
    ],
  },
  {
    category: 'Text Permissions',
    permissions: [
      { id: 'SEND_MESSAGES', name: 'Send Messages', desc: 'Post messages in text and thread channels.' },
      { id: 'ATTACH_FILES', name: 'Attach Files', desc: 'Upload images, videos, audio and documents.' },
      { id: 'ADD_REACTIONS', name: 'Add Reactions', desc: 'Add new emoji reactions to published messages.' },
      { id: 'MENTION_EVERYONE', name: 'Mention @everyone', desc: 'Trigger alerts to all members via @everyone and @here.' },
      { id: 'MANAGE_MESSAGES', name: 'Manage Messages', desc: 'Delete and pin messages authored by other members.' },
    ],
  },
  {
    category: 'Voice Permissions',
    permissions: [
      { id: 'CONNECT', name: 'Connect', desc: 'Join voice channels and hear participants.' },
      { id: 'SPEAK', name: 'Speak', desc: 'Transmit microphone audio in connected channels.' },
      { id: 'STREAM', name: 'Video & Screenshare', desc: 'Share webcam video or desktop screens.' },
      { id: 'MUTE_MEMBERS', name: 'Mute Members', desc: 'Server-mute other participants in voice rooms.' },
      { id: 'DEAFEN_MEMBERS', name: 'Deafen Members', desc: 'Server-deafen participants in voice rooms.' },
      { id: 'MOVE_MEMBERS', name: 'Move Members', desc: 'Move participants between different voice channels.' },
    ],
  },
];

const PRESET_ROLE_COLORS = [
  '#99aab5', // Default
  '#5865f2', // Blurple
  '#23a55a', // Green
  '#f0b232', // Amber
  '#eb459e', // Fuchsia
  '#da373c', // Red
  '#00a8fc', // Cyan
  '#9b59b6', // Violet
];

export const ServerSettings: React.FC<ServerSettingsProps> = ({
  server: initialServer,
  currentUser: initialUser,
  onClose,
  onUpdateServer,
}) => {
  const currentServer = initialServer || SERVERS[0];
  const user = initialUser || USERS[CURRENT_USER_ID];

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
  const roles: Role[] = rolesQuery.data ?? [];
  const [activeRoleId, setActiveRoleId] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [permissionDrafts, setPermissionDrafts] = useState<Record<string, string[]>>({});
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  // Members Tab States
  const [memberSearch, setMemberSearch] = useState('');
  const [members, setMembers] = useState<User[]>(serverState.members || Object.values(USERS));

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
    { id: 'e1', name: 'kekw', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=48&auto=format&fit=crop&q=80' },
    { id: 'e2', name: 'discordia_cat', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=48&auto=format&fit=crop&q=80' },
    { id: 'e3', name: 'pepe_hype', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=48&auto=format&fit=crop&q=80' },
  ]);

  // Boost Tab States
  const [userPoints, setUserPoints] = useState<number>(user.points ?? 840);
  const [userBoostedCount, setUserBoostedCount] = useState<number>(1);
  const [boostFeedback, setBoostFeedback] = useState<string | null>(null);

  // Active Role Object
  const activeRole = roles.find((r) => r.id === activeRoleId) || roles[0];
  const activeDraft = activeRole ? permissionDrafts[activeRole.id] : undefined;
  const activePermissions = activeDraft ?? activeRole?.permissions ?? [];
  const hasUnsavedPermissions =
    !!activeRole &&
    !!activeDraft &&
    (activeDraft.length !== (activeRole.permissions ?? []).length ||
      activeDraft.some((p) => !(activeRole.permissions ?? []).includes(p)));

  // Icon upload handler
  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Icon image must be less than 5 MB.');
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
    setPermissionsError(null);
    setPermissionDrafts((drafts) => ({ ...drafts, [role.id]: next }));
  };

  const discardPermissionDraft = (roleId: string) => {
    setPermissionsError(null);
    setPermissionDrafts(({ [roleId]: _discarded, ...rest }) => rest);
  };

  const handleSavePermissions = async (role: Role) => {
    const draft = permissionDrafts[role.id];
    if (!draft) return;
    setPermissionsError(null);
    try {
      await updatePermissionsMutation.mutateAsync({ roleId: role.id, permissions: draft });
      setPermissionDrafts(({ [role.id]: _saved, ...rest }) => rest);
    } catch (err) {
      setPermissionsError(err instanceof Error ? err.message : 'No se pudieron guardar los permisos.');
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

  // Kick member
  const handleKickMember = (memberId: string) => {
    const confirmKick = window.confirm('Are you sure you want to kick this member?');
    if (!confirmKick) return;
    setMembers(members.filter((m) => m.id !== memberId));
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
    const confirmed = window.confirm('Are you sure you want to delete this channel?');
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
        alert('Emoji size cannot exceed 5 MB.');
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
      setBoostFeedback('Insufficient points balance. Purchase points in Billing Settings!');
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

    setBoostFeedback('Server Boost applied successfully! 🎉 Thank you for your support.');
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

    setBoostFeedback('Boost retracted. 500 💠 points refunded to your wallet.');
    setTimeout(() => setBoostFeedback(null), 4000);
  };

  // Filter members
  const filteredMembers = members.filter((m) =>
    (m.displayName || m.username).toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        backgroundColor: '#313338',
        color: '#dbdee1',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sidebar Navigation */}
      <nav
        style={{
          width: sidebarCollapsed ? 64 : 240,
          backgroundColor: '#2b2d31',
          borderRight: '1px solid rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          transition: 'width 0.2s ease',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Sidebar Header */}
        <div
          style={{
            padding: sidebarCollapsed ? '16px 8px' : '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
          }}
        >
          {!sidebarCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#f2f3f5',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {serverState.name}
              </div>
              <div style={{ fontSize: 11, color: '#949ba4', textTransform: 'uppercase' }}>Server Settings</div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              background: 'none',
              border: 'none',
              color: '#b5bac1',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {[
            { id: 'overview', label: 'Overview', icon: Sliders },
            { id: 'roles', label: 'Roles', icon: Shield },
            { id: 'emojis', label: 'Emoji', icon: Smile },
            { id: 'boost', label: 'Server Boost', icon: Sparkles },
            { type: 'divider' },
            { id: 'channels', label: 'Channels', icon: Hash },
            { id: 'moderation', label: 'Moderation', icon: Flame },
            { id: 'audit-log', label: 'Audit Log', icon: FileText },
            { type: 'divider' },
            { id: 'members', label: 'Members', icon: Users },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ].map((item, index) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={`div-${index}`}
                  style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', margin: '8px 6px' }}
                />
              );
            }

            const IconComponent = item.icon as React.ElementType;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as TabType)}
                title={sidebarCollapsed ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: sidebarCollapsed ? '10px 0' : '8px 12px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: isActive ? '#ffffff' : '#b5bac1',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#dbdee1';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#b5bac1';
                  }
                }}
              >
                <IconComponent size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#313338',
        }}
      >
        {/* Top Control Bar with Close ESC button */}
        <div
          style={{
            height: 56,
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0, 0, 0, 0.25)',
            backgroundColor: '#2b2d31',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0, textTransform: 'capitalize' }}>
              {activeTab.replace('-', ' ')}
            </h2>
            {saveSuccess && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(35, 165, 90, 0.2)',
                  color: '#2dc770',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Check size={14} /> Saved
              </span>
            )}
          </div>

          {onClose && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={onClose}
                title="Close settings (ESC)"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  color: '#b5bac1',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div
                  style={{
                    border: '2px solid #b5bac1',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>ESC</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable View Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
          <div style={{ maxWidth: 840 }}>
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* Stats Header Banner */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 16,
                    padding: '20px',
                    backgroundColor: '#2b2d31',
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: '#949ba4', fontWeight: 600, textTransform: 'uppercase' }}>
                      Members
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#f2f3f5', marginTop: 4 }}>
                      {members.length}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#949ba4', fontWeight: 600, textTransform: 'uppercase' }}>
                      Boost Level
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#f47fff', marginTop: 4 }}>
                      Level {serverState.boostLevel}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#949ba4', fontWeight: 600, textTransform: 'uppercase' }}>
                      Active Boosts
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#f2f3f5', marginTop: 4 }}>
                      {serverState.boostCount} boosts
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#949ba4', fontWeight: 600, textTransform: 'uppercase' }}>
                      Channels
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#f2f3f5', marginTop: 4 }}>
                      {categories.reduce((acc, c) => acc + c.channels.length, 0)}
                    </div>
                  </div>
                </div>

                {/* Server Icon & Basic Info */}
                <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
                  {/* Icon Upload Box */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#b5bac1',
                        marginBottom: 8,
                      }}
                    >
                      Server Icon
                    </label>
                    <div style={{ position: 'relative', width: 100, height: 100 }}>
                      <img
                        src={serverIcon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}
                        alt={serverName}
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid rgba(255, 255, 255, 0.15)',
                        }}
                      />
                      <label
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 100,
                          height: 100,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0, 0, 0, 0.45)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          color: '#ffffff',
                          fontSize: 11,
                          fontWeight: 600,
                          transition: 'opacity 0.2s',
                          opacity: 0.9,
                        }}
                      >
                        <Edit3 size={18} />
                        Change
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleIconUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Server Name Input */}
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#b5bac1',
                        marginBottom: 8,
                      }}
                    >
                      Server Name <span style={{ color: '#da373c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      placeholder="e.g. Discordia Developers Hub"
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        padding: '10px 12px',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Server Description */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#b5bac1',
                      marginBottom: 8,
                    }}
                  >
                    Server Description
                  </label>
                  <textarea
                    rows={4}
                    value={serverDescription}
                    onChange={(e) => setServerDescription(e.target.value)}
                    placeholder="Tell visitors and new members what this server is about..."
                    style={{
                      width: '100%',
                      backgroundColor: '#1e1f22',
                      color: '#dbdee1',
                      border: '1px solid rgba(0, 0, 0, 0.3)',
                      borderRadius: 4,
                      padding: '10px 12px',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                </div>

                {/* Save Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleSaveOverview}
                    disabled={isSaving || !serverName.trim()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: '#5865f2',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: 4,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: isSaving || !serverName.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Saving Overview...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 2. ROLES TAB */}
            {activeTab === 'roles' && (
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
                          Los cambios de permisos se aplican al presionar "Guardar cambios". Nombre y color son de solo lectura por ahora; su edición llegará pronto.
                        </span>
                      </div>

                      {roles.length > 1 && !activeRole.isDefault && (
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

                    {/* Role Name & Color */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                          Role Name
                        </label>
                        <input
                          type="text"
                          value={activeRole.name}
                          readOnly
                          style={{
                            width: '100%',
                            backgroundColor: '#1e1f22',
                            color: '#dbdee1',
                            border: '1px solid rgba(0, 0, 0, 0.3)',
                            borderRadius: 4,
                            padding: '8px 10px',
                            fontSize: 14,
                            outline: 'none',
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
                              disabled
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: col,
                                border: activeRole.color === col ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.3)',
                                cursor: 'default',
                              }}
                            />
                          ))}
                          <input
                            type="color"
                            value={activeRole.color || '#99aab5'}
                            disabled
                            style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'default' }}
                          />
                        </div>
                      </div>
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
                              const isLocked = !isSupported || updatePermissionsMutation.isPending;
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

                    {(hasUnsavedPermissions || permissionsError) && (
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
                          border: `1px solid ${permissionsError ? 'rgba(218, 55, 60, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                          borderRadius: 6,
                        }}
                      >
                        <span style={{ fontSize: 13, color: permissionsError ? '#fa777c' : '#dbdee1' }}>
                          {permissionsError ?? 'Tenés cambios sin guardar.'}
                        </span>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => discardPermissionDraft(activeRole.id)}
                            disabled={updatePermissionsMutation.isPending}
                            style={{
                              background: 'transparent',
                              color: '#dbdee1',
                              border: 'none',
                              fontSize: 13,
                              cursor: updatePermissionsMutation.isPending ? 'default' : 'pointer',
                              padding: '6px 12px',
                            }}
                          >
                            Descartar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSavePermissions(activeRole)}
                            disabled={updatePermissionsMutation.isPending || !hasUnsavedPermissions}
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
                              cursor: updatePermissionsMutation.isPending ? 'default' : 'pointer',
                              opacity: updatePermissionsMutation.isPending || !hasUnsavedPermissions ? 0.6 : 1,
                            }}
                          >
                            {updatePermissionsMutation.isPending && (
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
            )}

            {/* 3. MEMBERS TAB */}
            {activeTab === 'members' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f3f5' }}>
                    Server Members ({members.length})
                  </div>

                  {/* Search bar */}
                  <div style={{ position: 'relative', width: 260 }}>
                    <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#949ba4' }} />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search members..."
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

                {/* Members List */}
                <div style={{ backgroundColor: '#2b2d31', borderRadius: 8, overflow: 'hidden' }}>
                  {filteredMembers.map((member) => {
                    const isOwner = member.id === serverState.ownerId;
                    return (
                      <div
                        key={member.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        {/* Member Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img
                            src={member.avatarUrl || member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60'}
                            alt={member.displayName}
                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>
                                {member.displayName}
                              </span>
                              {isOwner && (
                                <span title="Server Owner" style={{ color: '#faa81a', display: 'flex', alignItems: 'center' }}>
                                  <Crown size={15} />
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: 12, color: '#949ba4' }}>@{member.username}</span>
                          </div>
                        </div>

                        {/* Roles and Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              backgroundColor: 'rgba(88, 101, 242, 0.15)',
                              color: '#5865f2',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            Member
                          </span>

                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => handleKickMember(member.id)}
                              style={{
                                backgroundColor: 'transparent',
                                color: '#fa777c',
                                border: '1px solid rgba(218, 55, 60, 0.3)',
                                padding: '4px 10px',
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              Kick
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. CHANNELS TAB */}
            {activeTab === 'channels' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f3f5' }}>
                    Server Channels & Categories
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateChannelModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#5865f2',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: 4,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={16} /> Create Channel
                  </button>
                </div>

                {/* Categorized Channels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      style={{
                        backgroundColor: '#2b2d31',
                        borderRadius: 8,
                        padding: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#949ba4',
                          letterSpacing: '0.04em',
                          marginBottom: 12,
                        }}
                      >
                        {cat.name} ({cat.channels.length})
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {cat.channels.map((chan) => (
                          <div
                            key={chan.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              backgroundColor: '#1e1f22',
                              borderRadius: 4,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {chan.type === 'voice' ? (
                                <Volume2 size={16} color="#949ba4" />
                              ) : (
                                <Hash size={16} color="#949ba4" />
                              )}
                              <span style={{ fontSize: 14, fontWeight: 500, color: '#dbdee1' }}>{chan.name}</span>
                              {chan.topic && (
                                <span style={{ fontSize: 12, color: '#949ba4' }}>— {chan.topic}</span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteChannel(cat.id, chan.id)}
                              title="Delete channel"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#949ba4',
                                cursor: 'pointer',
                                padding: 4,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#fa777c')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#949ba4')}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Create Channel Modal */}
                {showCreateChannelModal && (
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000,
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#313338',
                        width: '100%',
                        maxWidth: 440,
                        borderRadius: 8,
                        padding: 24,
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                      }}
                    >
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f2f3f5', margin: '0 0 16px 0' }}>
                        Create Channel
                      </h3>

                      <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Channel Type */}
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 8 }}>
                            Channel Type
                          </label>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button
                              type="button"
                              onClick={() => setNewChannelType('text')}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px',
                                backgroundColor: newChannelType === 'text' ? '#2b2d31' : '#1e1f22',
                                border: newChannelType === 'text' ? '2px solid #5865f2' : '1px solid rgba(0,0,0,0.3)',
                                borderRadius: 6,
                                color: '#dbdee1',
                                cursor: 'pointer',
                              }}
                            >
                              <Hash size={18} />
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>Text</div>
                                <div style={{ fontSize: 11, color: '#949ba4' }}>Post messages, images</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setNewChannelType('voice')}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px',
                                backgroundColor: newChannelType === 'voice' ? '#2b2d31' : '#1e1f22',
                                border: newChannelType === 'voice' ? '2px solid #5865f2' : '1px solid rgba(0,0,0,0.3)',
                                borderRadius: 6,
                                color: '#dbdee1',
                                cursor: 'pointer',
                              }}
                            >
                              <Volume2 size={18} />
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>Voice</div>
                                <div style={{ fontSize: 11, color: '#949ba4' }}>Talk, share video</div>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Channel Name */}
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                            Channel Name
                          </label>
                          <input
                            type="text"
                            required
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            placeholder="new-channel"
                            style={{
                              width: '100%',
                              backgroundColor: '#1e1f22',
                              color: '#dbdee1',
                              border: '1px solid rgba(0, 0, 0, 0.3)',
                              borderRadius: 4,
                              padding: '8px 10px',
                              fontSize: 14,
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        {/* Category Selector */}
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                            Category
                          </label>
                          <select
                            value={newChannelCategory}
                            onChange={(e) => setNewChannelCategory(e.target.value)}
                            style={{
                              width: '100%',
                              backgroundColor: '#1e1f22',
                              color: '#dbdee1',
                              border: '1px solid rgba(0, 0, 0, 0.3)',
                              borderRadius: 4,
                              padding: '8px 10px',
                              fontSize: 14,
                              outline: 'none',
                            }}
                          >
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Modal Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                          <button
                            type="button"
                            onClick={() => setShowCreateChannelModal(false)}
                            style={{
                              backgroundColor: 'transparent',
                              color: '#dbdee1',
                              border: 'none',
                              padding: '8px 16px',
                              fontSize: 14,
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            style={{
                              backgroundColor: '#5865f2',
                              color: '#ffffff',
                              border: 'none',
                              padding: '8px 18px',
                              borderRadius: 4,
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Create Channel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. MODERATION TAB */}
            {activeTab === 'moderation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                  Content Filters & Auto-Moderation
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Explicit Filter */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      backgroundColor: '#2b2d31',
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>
                        Explicit Media Content Filter
                      </div>
                      <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
                        Automatically scan and block media uploads containing adult or violent content.
                      </div>
                    </div>
                    <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
                      <input
                        type="checkbox"
                        checked={explicitFilter}
                        onChange={(e) => setExplicitFilter(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        className="slider"
                        style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: explicitFilter ? '#23a55a' : '#80848e',
                          borderRadius: 24,
                          transition: '0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            height: 18,
                            width: 18,
                            left: explicitFilter ? 19 : 3,
                            bottom: 3,
                            backgroundColor: '#ffffff',
                            borderRadius: '50%',
                            transition: '0.2s',
                          }}
                        />
                      </span>
                    </label>
                  </div>

                  {/* Spam Filter */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      backgroundColor: '#2b2d31',
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>
                        Anti-Spam Rate Limiter
                      </div>
                      <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
                        Quarantine accounts sending repeated high-frequency messages or mention flooding.
                      </div>
                    </div>
                    <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
                      <input
                        type="checkbox"
                        checked={spamFilter}
                        onChange={(e) => setSpamFilter(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        className="slider"
                        style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: spamFilter ? '#23a55a' : '#80848e',
                          borderRadius: 24,
                          transition: '0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            height: 18,
                            width: 18,
                            left: spamFilter ? 19 : 3,
                            bottom: 3,
                            backgroundColor: '#ffffff',
                            borderRadius: '50%',
                            transition: '0.2s',
                          }}
                        />
                      </span>
                    </label>
                  </div>

                  {/* Require Email */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      backgroundColor: '#2b2d31',
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>
                        Require Verified Email
                      </div>
                      <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
                        Members must have a verified email linked to their Discordia account to post.
                      </div>
                    </div>
                    <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
                      <input
                        type="checkbox"
                        checked={requireEmail}
                        onChange={(e) => setRequireEmail(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        className="slider"
                        style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: requireEmail ? '#23a55a' : '#80848e',
                          borderRadius: 24,
                          transition: '0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            height: 18,
                            width: 18,
                            left: requireEmail ? 19 : 3,
                            bottom: 3,
                            backgroundColor: '#ffffff',
                            borderRadius: '50%',
                            transition: '0.2s',
                          }}
                        />
                      </span>
                    </label>
                  </div>

                  {/* Require 2FA */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      backgroundColor: '#2b2d31',
                      borderRadius: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>
                        Require 2FA for Moderation Roles
                      </div>
                      <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
                        Requires two-factor authentication to perform administrative actions.
                      </div>
                    </div>
                    <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
                      <input
                        type="checkbox"
                        checked={require2FA}
                        onChange={(e) => setRequire2FA(e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        className="slider"
                        style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: require2FA ? '#23a55a' : '#80848e',
                          borderRadius: 24,
                          transition: '0.2s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            height: 18,
                            width: 18,
                            left: require2FA ? 19 : 3,
                            bottom: 3,
                            backgroundColor: '#ffffff',
                            borderRadius: '50%',
                            transition: '0.2s',
                          }}
                        />
                      </span>
                    </label>
                  </div>
                </div>

                {/* Blocked Words Textarea */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#b5bac1',
                      marginBottom: 8,
                    }}
                  >
                    Prohibited Words (Comma-Separated)
                  </label>
                  <textarea
                    rows={3}
                    value={blockedWords}
                    onChange={(e) => setBlockedWords(e.target.value)}
                    placeholder="word1, phrase2, malicious-link"
                    style={{
                      width: '100%',
                      backgroundColor: '#1e1f22',
                      color: '#dbdee1',
                      border: '1px solid rgba(0, 0, 0, 0.3)',
                      borderRadius: 4,
                      padding: '10px 12px',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            )}

            {/* 6. AUDIT LOG TAB */}
            {activeTab === 'audit-log' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                    Administrative Audit Log
                  </h3>
                  <span style={{ fontSize: 12, color: '#949ba4' }}>Showing latest actions</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {AUDIT_LOG.slice(0, 15).map((entry: AuditEntry) => (
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
            )}

            {/* 7. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                  Server Notification Settings
                </h3>

                {/* Notification Frequency Radio */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1' }}>
                    Default Notification Frequency
                  </label>
                  {(
                    [
                      { id: 'all', title: 'All Messages', desc: 'Notify on every message sent in any channel.' },
                      { id: 'mentions', title: 'Only @mentions', desc: 'Recommended: Only alert when specifically tagged.' },
                      { id: 'nothing', title: 'Nothing', desc: 'Suppress all notifications from this server.' },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        backgroundColor: '#2b2d31',
                        borderRadius: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="serverNotifs"
                        checked={notifPreference === option.id}
                        onChange={() => setNotifPreference(option.id)}
                        style={{ accentColor: '#5865f2', width: 16, height: 16 }}
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>{option.title}</div>
                        <div style={{ fontSize: 12, color: '#949ba4' }}>{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Server Mute Switch */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    backgroundColor: '#2b2d31',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>Mute Server</div>
                    <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
                      Temporarily silence notifications without leaving the server.
                    </div>
                  </div>
                  <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
                    <input
                      type="checkbox"
                      checked={isServerMuted}
                      onChange={(e) => setIsServerMuted(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      className="slider"
                      style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: isServerMuted ? '#23a55a' : '#80848e',
                        borderRadius: 24,
                        transition: '0.2s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          height: 18,
                          width: 18,
                          left: isServerMuted ? 19 : 3,
                          bottom: 3,
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          transition: '0.2s',
                        }}
                      />
                    </span>
                  </label>
                </div>

                {isServerMuted && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#b5bac1', marginBottom: 6 }}>
                      Mute Duration
                    </label>
                    <select
                      value={muteDuration}
                      onChange={(e) => setMuteDuration(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1e1f22',
                        color: '#dbdee1',
                        border: '1px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: 4,
                        padding: '8px 10px',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    >
                      <option value="15_min">For 15 Minutes</option>
                      <option value="1_hour">For 1 Hour</option>
                      <option value="8_hours">For 8 Hours</option>
                      <option value="24_hours">For 24 Hours</option>
                      <option value="until_turn_on">Until I turn it back on</option>
                    </select>
                  </div>
                )}

                {/* Suppress @everyone */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    backgroundColor: '#2b2d31',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f2f3f5' }}>
                      Suppress @everyone and @here
                    </div>
                    <div style={{ fontSize: 12, color: '#949ba4', marginTop: 2 }}>
                      Mute all broadcast mentions regardless of member permissions.
                    </div>
                  </div>
                  <label className="switch" style={{ position: 'relative', width: 40, height: 24 }}>
                    <input
                      type="checkbox"
                      checked={suppressEveryone}
                      onChange={(e) => setSuppressEveryone(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      className="slider"
                      style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: suppressEveryone ? '#23a55a' : '#80848e',
                        borderRadius: 24,
                        transition: '0.2s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          height: 18,
                          width: 18,
                          left: suppressEveryone ? 19 : 3,
                          bottom: 3,
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          transition: '0.2s',
                        }}
                      />
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* 8. EMOJIS TAB */}
            {activeTab === 'emojis' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f3f5', margin: '0 0 4px 0' }}>
                      Custom Server Emojis
                    </h3>
                    <span style={{ fontSize: 12, color: '#949ba4' }}>
                      {customEmojis.length} / 50 standard emoji slots filled.
                    </span>
                  </div>

                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: '#5865f2',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: 4,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={16} /> Upload Emoji
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/gif"
                      onChange={handleEmojiUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {/* Emojis Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 16,
                  }}
                >
                  {customEmojis.map((emoji) => (
                    <div
                      key={emoji.id}
                      style={{
                        backgroundColor: '#2b2d31',
                        borderRadius: 8,
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <img
                        src={emoji.url}
                        alt={emoji.name}
                        style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 8 }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#dbdee1' }}>:{emoji.name}:</span>

                      <button
                        type="button"
                        onClick={() => setCustomEmojis(customEmojis.filter((e) => e.id !== emoji.id))}
                        title="Delete emoji"
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          background: 'none',
                          border: 'none',
                          color: '#949ba4',
                          cursor: 'pointer',
                          padding: 2,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#fa777c')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#949ba4')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. BOOST TAB */}
            {activeTab === 'boost' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {/* Hero Banner */}
                <div
                  style={{
                    padding: '28px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(244, 127, 255, 0.2) 0%, rgba(88, 101, 242, 0.25) 100%)',
                    border: '1px solid rgba(244, 127, 255, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #f47fff 0%, #ff73fa 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(244, 127, 255, 0.4)',
                      }}
                    >
                      <Sparkles size={24} color="#ffffff" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f2f3f5', margin: 0 }}>
                        Server Boost — Level {serverState.boostLevel}
                      </h3>
                      <span style={{ fontSize: 13, color: '#dbdee1' }}>
                        {serverState.boostCount} boosts helping unlock perks and enhanced bandwidth!
                      </span>
                    </div>
                  </div>

                  {/* Progress to Next Level */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#b5bac1', marginBottom: 6 }}>
                      <span>Level {serverState.boostLevel}</span>
                      <span>Next: Level {Math.min(3, serverState.boostLevel + 1)} ({serverState.boostCount}/7 Boosts)</span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.35)',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, (serverState.boostCount / 7) * 100)}%`,
                          background: 'linear-gradient(90deg, #f47fff 0%, #5865f2 100%)',
                          borderRadius: 4,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {boostFeedback && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        backgroundColor: 'rgba(35, 165, 90, 0.2)',
                        border: '1px solid #23a55a',
                        borderRadius: 6,
                        color: '#2dc770',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      <Check size={16} />
                      {boostFeedback}
                    </div>
                  )}

                  {/* Actions & Points Balance */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 8,
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: '#b5bac1' }}>Your Wallet Balance:</span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 15,
                          fontWeight: 700,
                          color: '#5865f2',
                        }}
                      >
                        💠 {userPoints} Points
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {userBoostedCount > 0 && (
                        <button
                          type="button"
                          onClick={handleRetractBoost}
                          style={{
                            backgroundColor: 'transparent',
                            color: '#fa777c',
                            border: '1px solid rgba(218, 55, 60, 0.4)',
                            padding: '8px 14px',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Retract Boost
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleBoostServer}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'linear-gradient(135deg, #f47fff 0%, #ff73fa 100%)',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 18px',
                          borderRadius: 6,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(244, 127, 255, 0.35)',
                        }}
                      >
                        <Sparkles size={16} /> Boost Server (500 💠)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Boost Perks Table */}
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#f2f3f5', marginBottom: 12 }}>
                    Unlocked Level Perks
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    <div
                      style={{
                        backgroundColor: '#2b2d31',
                        borderRadius: 8,
                        padding: 16,
                        border: serverState.boostLevel >= 1 ? '2px solid #f47fff' : '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f3f5', marginBottom: 4 }}>Level 1 (2 Boosts)</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#dbdee1', lineHeight: 1.5 }}>
                        <li>+50 Extra Emoji Slots</li>
                        <li>128 Kbps Audio Quality</li>
                        <li>Custom Server Invite Background</li>
                      </ul>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#2b2d31',
                        borderRadius: 8,
                        padding: 16,
                        border: serverState.boostLevel >= 2 ? '2px solid #f47fff' : '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f3f5', marginBottom: 4 }}>Level 2 (4 Boosts)</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#dbdee1', lineHeight: 1.5 }}>
                        <li>+100 Extra Emoji Slots</li>
                        <li>256 Kbps Audio Quality</li>
                        <li>50MB Upload Limit for all members</li>
                        <li>1080p 60FPS Streams</li>
                      </ul>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#2b2d31',
                        borderRadius: 8,
                        padding: 16,
                        border: serverState.boostLevel >= 3 ? '2px solid #f47fff' : '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f3f5', marginBottom: 4 }}>Level 3 (7 Boosts)</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#dbdee1', lineHeight: 1.5 }}>
                        <li>+150 Extra Emoji Slots</li>
                        <li>384 Kbps Audio Quality</li>
                        <li>100MB Upload Limit</li>
                        <li>Custom Vanity URL</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ServerSettings;
