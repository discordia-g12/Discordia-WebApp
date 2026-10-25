import React, { useState } from 'react';
import { Server, Channel, User, ChannelType } from '../../../types';
import { useRolesAdmin } from '@discordia/core';
import { TabType } from './shared';

/** Lo que recibe la pantalla de ajustes del servidor. */
export interface ServerSettingsProps {
  server?: Server;
  currentUser?: User;
  onClose?: () => void;
  onUpdateServer?: (updatedServer: Server) => void;
}


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

  // Roles: estado y reglas de core (los mismos que mobile); acá se confirma con el diálogo del navegador
  const rolesAdmin = useRolesAdmin(serverState.id, { confirm: (message) => window.confirm(message) });
  const { roles } = rolesAdmin;

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
    ...rolesAdmin,

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
    handleIconUpload,
    handleSaveOverview,
    handleCreateChannel,
    handleDeleteChannel,
    handleEmojiUpload,
    handleBoostServer,
    handleRetractBoost,
  };
}

export type ServerSettingsState = ReturnType<typeof useServerSettingsState>;
