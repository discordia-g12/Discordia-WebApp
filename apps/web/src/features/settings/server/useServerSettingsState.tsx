import React, { useState } from 'react';
import { Server, Channel, User, ChannelType } from '../../../types';
import {
  imageFileError,
  serverBannerErrorMessage,
  serverIconErrorMessage,
  serverSettingsErrorMessage,
  serverSettingsValidationError,
  updateServer,
  useRolesAdmin,
} from '@discordia/core';
import { TabType } from './shared';
import { useServerBanner, useServerIcon } from '../../servers/serverActions';
import { showToast } from '../../../app/uiStore';

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
  const currentServer: Server | null = initialServer || null;
  const user = initialUser || ({ id: '' } as User);

  const [serverState, setServerState] = useState<Server>({ ...currentServer } as Server);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Overview Tab States
  const [serverName, setServerName] = useState(serverState.name);
  const [serverDescription, setServerDescription] = useState(serverState.description || '');
  const [serverIcon, setServerIcon] = useState(serverState.iconUrl || '');
  const [iconBusy, setIconBusy] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const serverIconActions = useServerIcon();
  const [serverBanner, setServerBanner] = useState(serverState.banner || '');
  const [bannerBusy, setBannerBusy] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const serverBannerActions = useServerBanner();
  const [overviewError, setOverviewError] = useState<string | null>(null);
  // Nombre y descripción guardados: el formulario compara contra esto para saber si hay cambios
  const [savedName, setSavedName] = useState(serverState.name);
  const [savedDescription, setSavedDescription] = useState(serverState.description || '');
  const overviewDirty = serverName.trim() !== savedName || serverDescription.trim() !== savedDescription;

  // Roles: estado y reglas de core (los mismos que mobile); acá se confirma con el diálogo del navegador
  const rolesAdmin = useRolesAdmin(serverState.id, { confirm: (message) => window.confirm(message) });

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

  // Ícono: se guarda apenas se elige (PUT /servers/{id}/icon) y se muestra el que devuelve la API
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo
    e.target.value = '';
    if (!file || iconBusy) return;

    const error = imageFileError(file);
    if (error) {
      setIconError(error);
      return;
    }

    setIconBusy(true);
    setIconError(null);
    try {
      setServerIcon((await serverIconActions.change(serverState.id, file)) || '');
      showToast('Ícono actualizado', 'success');
    } catch (err) {
      setIconError(serverIconErrorMessage(err));
    } finally {
      setIconBusy(false);
    }
  };

  const handleRemoveIcon = async () => {
    if (iconBusy) return;
    setIconBusy(true);
    setIconError(null);
    try {
      setServerIcon((await serverIconActions.remove(serverState.id)) || '');
      showToast('Ícono quitado', 'success');
    } catch (err) {
      setIconError(serverIconErrorMessage(err));
    } finally {
      setIconBusy(false);
    }
  };

  // Banner: igual que el ícono, se guarda apenas se elige (PUT /servers/{id}/banner)
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || bannerBusy) return;

    const error = imageFileError(file);
    if (error) {
      setBannerError(error);
      return;
    }

    setBannerBusy(true);
    setBannerError(null);
    try {
      setServerBanner((await serverBannerActions.change(serverState.id, file)) || '');
      showToast('Banner actualizado', 'success');
    } catch (err) {
      setBannerError(serverBannerErrorMessage(err));
    } finally {
      setBannerBusy(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (bannerBusy) return;
    setBannerBusy(true);
    setBannerError(null);
    try {
      setServerBanner((await serverBannerActions.remove(serverState.id)) || '');
      showToast('Banner quitado', 'success');
    } catch (err) {
      setBannerError(serverBannerErrorMessage(err));
    } finally {
      setBannerBusy(false);
    }
  };

  // Nombre y descripción: PATCH /servers/{id} con lo que cambió. Si el backend lo rechaza (permisos o datos
  // inválidos) se muestra el motivo y no se toca nada: ni el caché ni lo guardado
  const handleSaveOverview = async () => {
    if (isSaving) return;
    const payload: { name?: string; description?: string } = {};
    if (serverName.trim() !== savedName) payload.name = serverName;
    if (serverDescription.trim() !== savedDescription) payload.description = serverDescription;
    if (Object.keys(payload).length === 0) return;

    const invalid = serverSettingsValidationError(payload);
    if (invalid) {
      setOverviewError(invalid);
      return;
    }

    setIsSaving(true);
    setOverviewError(null);
    try {
      const updated = await updateServer(serverState.id, payload);
      setServerState((prev) => ({ ...prev, name: updated.name, description: updated.description }));
      setServerName(updated.name);
      setSavedName(updated.name);
      setServerDescription(updated.description || '');
      setSavedDescription(updated.description || '');
      onUpdateServer?.(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setOverviewError(serverSettingsErrorMessage(err));
    } finally {
      setIsSaving(false);
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
    handleRemoveIcon,
    iconBusy,
    iconError,
    serverBanner,
    handleBannerUpload,
    handleRemoveBanner,
    bannerBusy,
    bannerError,
    overviewDirty,
    overviewError,
    handleSaveOverview,
    handleCreateChannel,
    handleDeleteChannel,
    handleEmojiUpload,
    handleBoostServer,
    handleRetractBoost,
  };
}

export type ServerSettingsState = ReturnType<typeof useServerSettingsState>;
