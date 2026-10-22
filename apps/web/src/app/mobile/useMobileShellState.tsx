import React, { useState } from 'react';
import {
  Message,
  DirectMessage,
} from '../../types';
import { MobileScreen, ActiveSheet, EMPTY_SERVER } from './shared';
import type { MobileShellProps } from '../MobileShell';

/** Estado y handlers de MobileShell: viven en el componente y lo comparten todas sus pestañas. */
export function useMobileShellState(props: MobileShellProps) {
  const {
    initialScreen = 'channels',
    servers = [],
    currentUser = { id: '' } as any,
    onOpenModal,
    onConfirmAction,
  } = props;
  // Estados de navegación
  const [screen, setScreen] = useState<MobileScreen>(initialScreen);
  const [activeServerId, setActiveServerId] = useState<string>(servers[0]?.id || 's1');
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDmId, setActiveDmId] = useState<string>('dm-1');
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>('none');

  // Estados de audio y presencia
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Estados de configuración de servidor en sheet
  const [hideMutedChannels, setHideMutedChannels] = useState(false);
  const [allowMemberDMs, setAllowMemberDMs] = useState(true);

  // Mensaje en chat activo
  const [chatInput, setChatInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Record<string, Message[]>>({});

  // Servidor y Canal actuales
  // Sin servidores todavía (cargando, o el usuario no tiene ninguno): un servidor vacío en vez de romper
  const activeServer = servers.find((s) => s.id === activeServerId) || servers[0] || EMPTY_SERVER;
  const allChannels = activeServer.categories.flatMap((cat) => cat.channels);
  const activeChannel = allChannels.find((c) => c.id === activeChannelId) || allChannels[0];
  const activeDm = ([] as DirectMessage[]).find((d) => d.id === activeDmId);

  // Manejo de envío de mensajes en Chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChannelId) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      channelId: activeChannelId,
      authorId: currentUser.id,
      author: currentUser,
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
      type: 'normal',
    };

    setLocalMessages((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMessage],
    }));

    setChatInput('');
  };

  const channelMessages = activeChannelId ? (localMessages[activeChannelId] || []) : [];

  return {

    initialScreen,
    servers,
    currentUser,
    onOpenModal,
    onConfirmAction,
    screen,
    setScreen,
    activeServerId,
    setActiveServerId,
    activeChannelId,
    setActiveChannelId,
    activeDmId,
    setActiveDmId,
    activeSheet,
    setActiveSheet,
    isMuted,
    setIsMuted,
    isDeafened,
    setIsDeafened,
    hideMutedChannels,
    setHideMutedChannels,
    allowMemberDMs,
    setAllowMemberDMs,
    chatInput,
    setChatInput,
    localMessages,
    setLocalMessages,
    activeServer,
    allChannels,
    activeChannel,
    activeDm,
    handleSendMessage,
    channelMessages,
  };
}

export type MobileShellState = ReturnType<typeof useMobileShellState>;
