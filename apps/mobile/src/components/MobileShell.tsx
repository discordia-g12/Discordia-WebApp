import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth, useData, useUI } from '../providers/AppProviders'
import { makeStyles } from '../theme'
import { Background, ConnectionBanner, EmptyState, Skeleton, ActionLink, keyboardAvoidingBehavior } from '../ui'
import type { Channel, Message, User } from '../types'
import ChannelActionModals from './channels/ChannelActionModals'
import ChannelList from './channels/ChannelList'
import ChatHeader from './chat/ChatHeader'
import Composer, { type PendingAttachment } from './chat/Composer'
import ConfirmModal from './shared/ConfirmModal'
import InviteModal from './servers/InviteModal'
import CreateChannelModal from './channels/CreateChannelModal'
import CreateCategoryModal from './channels/CreateCategoryModal'
import CreateServerModal from './servers/CreateServerModal'
import MessageList from './chat/MessageList'
import EditProfileModal from './profile/EditProfileModal'
import PublicProfileModal from './profile/PublicProfileModal'
import FriendsTab from './friends/FriendsTab'
import Toast from './shared/Toast'
import {
  SERVER_SETTINGS_SECTIONS,
  ServerSettingsScreen,
  type ServerSettingsSection,
} from './settings/server/ServerSettingsScreen'
import { UserSettingsScreen } from './settings/user/UserSettingsScreen'
import VoiceScreen, { type VoiceScreenParticipant } from './voice/VoiceScreen'
import VoiceParticipantActions, { type VoiceParticipantTarget } from './voice/VoiceParticipantActions'
import { BottomTabs, type ShellTab } from './shell/BottomTabs'
import { CallBar } from './shell/CallBar'
import { ProfileTab } from './shell/ProfileTab'
import { ServerMenu } from './shell/ServerMenu'
import { ServerTabsRow } from './shell/ServerTabsRow'
import { Padded, Pane, Screen } from './shell/ShellScreen'
import { useUserDisplay } from '../hooks/useUserProfiles'
import { useAppActive } from '../hooks/useAppActive'
import { useDmInbox } from '../hooks/useDmInbox'
import { usePickAttachment } from '../hooks/usePickAttachment'
import type { VoiceChannelParticipant } from './channels/VoiceChannelParticipants'
import { isVoiceSupported } from '../utils/voice'
import {
  ApiError,
  errorMessageFor,
  isLocalCategoryId,
  shiftCategory,
  shiftChannel,
  chatRemovalMessage,
  chatWriteBlockMessage,
  useChatSocket,
  useVoicePresence,
  useVoiceRoom,
  canInServer,
  canSeeSettingsSection,
  isVoiceChannelLocked,
  voiceDisconnectMessage,
  applyUnread,
  useAutoMarkChannelRead,
  useMarkAllReadMutation,
  useMarkChannelReadMutation,
  useUnreadQuery,
  uploadAttachment,
  type MessageAttachment,
} from '@discordia/core'

/** Lo que se ve en Servidores: la lista de canales, o un canal abierto a pantalla completa. */
type MobileScreen = 'channels' | 'chat' | 'voice'

/** Mientras el teclado está abierto la barra inferior se oculta: la de escritura queda sobre el teclado. */
function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true))
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  return visible
}

/**
 * App mobile del rediseño (docs/TODO-REDISENO.md, sección 5), como la mobile web: barra inferior con
 * Servidores, Amigos, Notificaciones y Mi perfil; en Servidores, la tira de franjas arriba y los canales del
 * servidor bajo su nombre en gigante; un canal (chat o voz) se abre a pantalla completa con la vuelta
 * arriba. Durante una llamada, sus controles van sobre la barra inferior en toda la app.
 */
export default function MobileShell() {
  const styles = useStyles()
  const { logout } = useAuth()
  const {
    users,
    servers: loadedServers,
    serversLoaded,
    messages,
    currentUserId,
    sendMessage,
    fetchChannelMessages,
    fetchOlderChannelMessages,
    hasOlderMessages,
    loadingOlderMessages,
    leaveServer,
    deleteServer,
    reorderChannels,
    reorderCategories,
    addOptimisticMessage,
    confirmOptimisticMessage,
    failOptimisticMessage,
    refreshServers,
  } = useData()
  const { selectedServerId, selectedChannelId, selectChannel, selectServer, showToast } = useUI()
  const [tab, setTab] = useState<ShellTab>('servers')
  const [screen, setScreen] = useState<MobileScreen>('channels')
  const keyboardVisible = useKeyboardVisible()
  const appActive = useAppActive()
  const pickAttachment = usePickAttachment()
  // Pestaña Amigos: el usuario del chat abierto (null: las listas)
  const [dmUserId, setDmUserId] = useState<string | null>(null)
  // Perfil público abierto, desde cualquier pestaña
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const inbox = useDmInbox({ activeUserId: tab === 'messages' ? dmUserId : null, appActive })

  // No leídos de cada canal y servidor. El chat abierto no cuenta: ya se está leyendo
  const { data: unread } = useUnreadQuery()
  const readingChannelId = tab === 'servers' && screen === 'chat' ? selectedChannelId : null
  const servers = useMemo(
    () => applyUnread(loadedServers, unread, readingChannelId),
    [loadedServers, unread, readingChannelId],
  )
  const markChannelRead = useMarkChannelReadMutation()
  const markAllRead = useMarkAllReadMutation()

  // Voz (LiveKit). Si la conexión se corta sola, volver a la lista de canales
  const voice = useVoiceRoom({
    onUnexpectedDisconnect: reason => {
      setScreen(current => (current === 'voice' ? 'channels' : current))
      showToast(voiceDisconnectMessage(reason), reason === 'duplicate' ? 'info' : 'error')
    },
  })
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState('')
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [createServerModalOpen, setCreateServerModalOpen] = useState(false)
  const [createServerMode, setCreateServerMode] = useState<'create' | 'join'>('create')
  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false)
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false)
  // Modo ordenar canales y categorías (flechas subir/bajar)
  const [reorderMode, setReorderMode] = useState(false)
  // Un reorden por vez: cada pedido manda el orden completo y no deben pisarse
  const reorderInFlight = useRef(false)
  const [channelModalCategoryId, setChannelModalCategoryId] = useState<string | null>(null)
  // Ajustes del servidor abiertos, en qué sección (null: cerrados)
  const [serverSettings, setServerSettings] = useState<ServerSettingsSection | null>(null)
  const [deleteServerConfirmOpen, setDeleteServerConfirmOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [leaveServerConfirmOpen, setLeaveServerConfirmOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [editChannelModalOpen, setEditChannelModalOpen] = useState(false)
  const [deleteChannelModalOpen, setDeleteChannelModalOpen] = useState(false)
  const [targetChannelForAction, setTargetChannelForAction] = useState<Channel | null>(null)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [userSettingsOpen, setUserSettingsOpen] = useState(false)
  // Canal de voz al que se quiere pasar estando conectado a otro (pide confirmación)
  const [pendingVoiceSwitch, setPendingVoiceSwitch] = useState<Channel | null>(null)
  // Participante sobre el que se mantuvo presionado (menú para silenciarlo solo para vos)
  const [voiceActionTarget, setVoiceActionTarget] = useState<VoiceParticipantTarget | null>(null)

  const server = servers.find(s => s.id === selectedServerId) ?? servers[0]
  const allChannels: Channel[] = server ? server.categories.flatMap(c => c.channels) : []
  const channel = allChannels.find(c => c.id === selectedChannelId) ?? null
  const channelMessages: Message[] = channel ? messages[channel.id] ?? [] : []
  // El propio usuario (llega con el perfil de la sesión)
  const me: User = users[currentUserId] ?? { id: currentUserId, username: 'usuario', displayName: 'Usuario', status: 'online' }

  // Canal de voz activo (puede ser de otro servidor que el seleccionado)
  const voiceLocation = useMemo(() => {
    if (!voice.channelId) return null
    for (const srv of servers) {
      const ch = srv.categories.flatMap(c => c.channels).find(c => c.id === voice.channelId)
      if (ch) return { server: srv, channel: ch }
    }
    return null
  }, [servers, voice.channelId])

  // Quién está en cada canal de voz del servidor actual, en vivo (#4)
  const serverVoiceChannelIds = useMemo(
    () =>
      (server?.categories ?? [])
        .flatMap(c => c.channels)
        .filter(c => c.type === 'voice')
        .map(c => c.id),
    [server],
  )
  const voicePresence = useVoicePresence(serverVoiceChannelIds)

  // IDs (LiveKit, presencia, autores o mencionados) -> nombre y avatar; los que la app no conoce se piden al backend
  const describeUser = useUserDisplay([
    ...voice.participants.map(p => p.id),
    ...Object.values(voicePresence).flat(),
    ...channelMessages.flatMap(m => [m.authorId, ...(m.mentions?.users ?? [])]),
  ])

  const voiceParticipants: VoiceScreenParticipant[] = voice.participants.map(p => ({
    id: p.id,
    ...describeUser(p.id),
    isLocal: p.isLocal,
    isSpeaking: p.isSpeaking,
    isMuted: p.isMuted,
    isLocallyMuted: !p.isLocal && !!voice.locallyMutedUsers[p.id],
    videoTrack: p.videoTrack,
  }))

  // Lista de canales: presencia de todos; en el canal propio, los datos de LiveKit (quién habla, mute)
  const sidebarVoiceParticipants: Record<string, VoiceChannelParticipant[]> = {}
  for (const [channelId, userIds] of Object.entries(voicePresence)) {
    sidebarVoiceParticipants[channelId] = userIds.map(id => ({
      id,
      ...describeUser(id),
      isLocallyMuted: id !== currentUserId && !!voice.locallyMutedUsers[id],
    }))
  }
  if (voice.channelId && voiceParticipants.length > 0) {
    sidebarVoiceParticipants[voice.channelId] = voiceParticipants
  }

  const lastMessageId = useMemo(() => {
    for (let i = channelMessages.length - 1; i >= 0; i--) {
      const m = channelMessages[i]
      if (m.status !== 'pending' && m.status !== 'failed' && !m.id.startsWith('temp-')) {
        return m.id
      }
    }
    return undefined
  }, [channelMessages])

  // Con el chat a la vista se marca leído al abrirlo y con cada mensaje; en segundo plano, no
  useAutoMarkChannelRead(readingChannelId, lastMessageId, { enabled: appActive })

  const activeSocketChannelId =
    channel && channel.type !== 'voice' ? channel.id : null

  const socket = useChatSocket({
    channelId: activeSocketChannelId,
    userId: currentUserId,
    lastMessageIdSeen: lastMessageId,
    onMessage: payload => {
      if (channel) {
        confirmOptimisticMessage(channel.id, payload)
      }
    },
    onError: errMsg => {
      if (channel) {
        failOptimisticMessage(channel.id)
        if (
          errMsg.toLowerCase().includes('permission') ||
          errMsg.toLowerCase().includes('permiso')
        ) {
          showToast('No tienes permisos para escribir en este canal.', 'error')
        } else {
          showToast(errMsg, 'error')
        }
      }
    },
    onRemoved: reason => {
      // Lo sacaron del servidor (ban o expulsión): el chat no reintenta y el servidor sale de la lista
      showToast(chatRemovalMessage(reason), 'error')
      setScreen('channels')
      refreshServers().catch(() => undefined)
    },
  })
  const chatBlockedMessage = activeSocketChannelId ? chatWriteBlockMessage(socket) : null

  const isServerOwner = !!server && server.ownerId === currentUserId
  // Qué acciones se ofrecen en el servidor elegido (el backend vuelve a chequear cada una)
  const canManageChannels = canInServer(server, currentUserId, 'MANAGE_CHANNELS')
  const canInvite = canInServer(server, currentUserId, 'CREATE_INSTANT_INVITE')
  const canOpenSettingsSection = (section: ServerSettingsSection) => canSeeSettingsSection(server, currentUserId, section)
  const isChannelLocked = (ch: Channel) => isVoiceChannelLocked(server, ch, currentUserId)

  const handleOpenEditChannel = (ch: Channel) => {
    // CA 2: Sin permisos
    if (!canManageChannels) {
      showToast('No tenés permiso para editar canales en este servidor.', 'error')
      return
    }
    setTargetChannelForAction(ch)
    setEditChannelModalOpen(true)
  }

  const handleChannelDeleted = () => {
    if (targetChannelForAction && targetChannelForAction.id === selectedChannelId) {
      const remaining = allChannels.filter(c => c.id !== targetChannelForAction.id)
      if (remaining.length > 0) {
        selectChannel(remaining[0].id)
      } else {
        selectChannel(null)
        setScreen('channels')
      }
    }
    setTargetChannelForAction(null)
  }

  const handleSelectServer = (id: string) => selectServer(id)

  const handleSelectChannel = (ch: Channel) => {
    if (ch.type === 'voice') {
      if (voice.channelId && voice.channelId !== ch.id && isVoiceSupported) {
        setPendingVoiceSwitch(ch)
      } else {
        handleJoinVoiceChannel(ch)
      }
      return
    }
    selectChannel(ch.id)
    fetchChannelMessages(ch.id)
    setScreen('chat')
  }

  const handleJoinVoiceChannel = async (ch: Channel) => {
    if (!isVoiceSupported) {
      showToast('La voz necesita el development build (ver README de mobile)', 'info')
      return
    }
    setScreen('voice')
    if (voice.channelId === ch.id) return
    try {
      const { microphoneAvailable } = await voice.join(ch.id)
      showToast(
        microphoneAvailable
          ? 'Conectado al canal de voz'
          : 'Conectado sin micrófono: revisá los permisos de la app',
        microphoneAvailable ? 'success' : 'info',
      )
    } catch (err) {
      console.error('[Voice] Error al unirse al canal:', err)
      setScreen(current => (current === 'voice' ? 'channels' : current))
      const forbidden = err instanceof ApiError && err.status === 403
      showToast(
        forbidden ? 'No tenés permiso para entrar a este canal de voz' : 'No se pudo conectar al canal de voz',
        'error',
      )
      // Le cambiaron los permisos desde que se cargó el servidor: se vuelven a pedir para mostrar el candado
      if (forbidden) refreshServers()
    }
  }

  const handleDisconnectVoice = () => {
    voice.leave()
    setScreen(current => (current === 'voice' ? 'channels' : current))
    showToast('Desconectado de la llamada', 'info')
  }

  const handleToggleCamera = async () => {
    const turningOn = !voice.isCameraOn
    const ok = await voice.toggleCamera()
    if (!ok && turningOn) {
      showToast('No se pudo prender la cámara: revisá los permisos de la app', 'info')
    }
  }

  const toggleCategory = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  // La sección general es local (canales sin categoría): para el backend equivale a null.
  const saveOrder = async (save: () => Promise<void>) => {
    if (reorderInFlight.current) return
    reorderInFlight.current = true
    try {
      await save()
    } catch (err) {
      showToast(
        errorMessageFor(
          err,
          {
            400: 'Hay un canal con el mismo nombre en esa categoría.',
            403: 'No tenés permisos para reordenar canales y categorías en este servidor.',
          },
          'No se pudo guardar el nuevo orden.',
        ),
        'error',
      )
    } finally {
      reorderInFlight.current = false
    }
  }

  const handleShiftChannel = (channelId: string, direction: -1 | 1) => {
    if (!server) return
    const categories = shiftChannel(server.categories, channelId, direction)
    if (categories === server.categories) return
    saveOrder(() => reorderChannels(server.id, categories))
  }

  const handleShiftCategory = (categoryId: string, direction: -1 | 1) => {
    if (!server) return
    const categories = shiftCategory(server.categories, categoryId, direction)
    if (categories === server.categories) return
    saveOrder(() => reorderCategories(server.id, categories))
  }

  const handleAddChannel = (categoryId: string | null) => {
    setChannelModalCategoryId(categoryId && !isLocalCategoryId(categoryId) ? categoryId : null)
    setCreateChannelModalOpen(true)
  }

  const handlePickAttachment = async () => {
    const picked = await pickAttachment()
    if (picked) setPendingAttachment(picked)
  }

  const handleSend = async () => {
    if (!channel || isUploadingAttachment) return
    const trimmed = draft.trim()

    // CA 2: Evitar envío si está vacío y sin adjunto (o si no puede escribir: el input ya está deshabilitado)
    if ((!trimmed && !pendingAttachment) || chatBlockedMessage) return

    // CA 4: Bloquear o advertir si supera los 2000 caracteres
    if (trimmed.length > 2000) {
      showToast('El mensaje no puede superar los 2000 caracteres.', 'error')
      return
    }

    let attachmentPayload: MessageAttachment | undefined

    if (pendingAttachment) {
      try {
        setIsUploadingAttachment(true)
        const uploaded = await uploadAttachment(channel.id, {
          uri: pendingAttachment.uri,
          name: pendingAttachment.name,
          type: pendingAttachment.type,
        })
        attachmentPayload = uploaded
      } catch (err: unknown) {
        setIsUploadingAttachment(false)
        const msg = (err instanceof Error && err.message) || 'No se pudo subir el archivo.'
        showToast(msg, 'error')
        return
      } finally {
        setIsUploadingAttachment(false)
      }
    }

    const attachmentsList = attachmentPayload ? [attachmentPayload] : undefined

    // CA 1: Actualización optimista
    addOptimisticMessage(channel.id, trimmed, attachmentsList)
    setDraft('')
    setPendingAttachment(null)

    // Envío por WebSocket si es un canal activo, o fallback
    if (activeSocketChannelId) {
      socket.sendMessage(trimmed, attachmentsList).catch(() => {
        failOptimisticMessage(channel.id)
        showToast('No se pudo enviar el mensaje por WebSocket.', 'error')
      })
    } else {
      sendMessage(channel.id, trimmed, attachmentsList)
    }
  }

  const voiceParticipantActions = (
    <VoiceParticipantActions
      participant={voiceActionTarget}
      isLocallyMuted={!!(voiceActionTarget && voice.locallyMutedUsers[voiceActionTarget.id])}
      onToggleLocalMute={voice.toggleLocalMute}
      onClose={() => setVoiceActionTarget(null)}
    />
  )

  const channelActionModals = (
    <ChannelActionModals
      serverId={server?.id}
      channel={targetChannelForAction}
      categories={server?.categories}
      editVisible={editChannelModalOpen}
      deleteVisible={deleteChannelModalOpen}
      onCloseEdit={() => {
        setEditChannelModalOpen(false)
        setTargetChannelForAction(null)
      }}
      onRequestDelete={ch => {
        setEditChannelModalOpen(false)
        setTargetChannelForAction(ch)
        setDeleteChannelModalOpen(true)
      }}
      onCloseDelete={() => {
        setDeleteChannelModalOpen(false)
        setTargetChannelForAction(null)
      }}
      onDeleted={handleChannelDeleted}
    />
  )

  const goTo = (next: ShellTab) => {
    if (next !== tab) {
      setScreen('channels')
      setDmUserId(null)
    }
    setTab(next)
  }

  // El propio perfil no se abre: se edita desde la pestaña Perfil
  const openProfile = useCallback(
    (userId: string) => {
      if (userId !== currentUserId) setProfileUserId(userId)
    },
    [currentUserId],
  )

  const openDirectMessage = (userId: string) => {
    goTo('messages')
    setDmUserId(userId)
  }

  const pickServer = (id: string) => {
    handleSelectServer(id)
    setScreen('channels')
  }

  const openVoice = () => {
    setTab('servers')
    setScreen('voice')
  }

  const firstSettingsSection = SERVER_SETTINGS_SECTIONS.find(canOpenSettingsSection)
  const markReadError = () => showToast('No se pudo marcar como leído', 'error')
  const unreadChannels = allChannels.filter(c => (c.unreadCount ?? 0) > 0)
  const serverMenuItems = server
    ? [
        {
          label: 'Marcar como leído',
          onSelect: unreadChannels.length
            ? () => unreadChannels.forEach(c => markChannelRead.mutate({ channelId: c.id }, { onError: markReadError }))
            : undefined,
        },
        {
          label: 'Marcar todo como leído',
          onSelect: servers.some(s => s.unread)
            ? () => markAllRead.mutate(undefined, { onError: markReadError })
            : undefined,
        },
        { label: 'Invitar personas', onSelect: canInvite ? () => setInviteModalOpen(true) : undefined },
        {
          label: 'Ajustes del servidor',
          onSelect: firstSettingsSection ? () => setServerSettings(firstSettingsSection) : undefined,
        },
        { label: 'Miembros', onSelect: canOpenSettingsSection('members') ? () => setServerSettings('members') : undefined },
        { label: 'Roles', onSelect: canOpenSettingsSection('roles') ? () => setServerSettings('roles') : undefined },
        { label: 'Crear canal', onSelect: canManageChannels ? () => handleAddChannel(null) : undefined },
        { label: 'Crear categoría', onSelect: canManageChannels ? () => setCreateCategoryModalOpen(true) : undefined },
        {
          label: reorderMode ? 'Terminar de ordenar' : 'Ordenar canales',
          onSelect: canManageChannels ? () => setReorderMode(on => !on) : undefined,
          detail: reorderMode ? 'activo' : undefined,
        },
        isServerOwner
          ? { label: 'Eliminar servidor', onSelect: () => setDeleteServerConfirmOpen(true), separated: true }
          : { label: 'Abandonar servidor', onSelect: () => setLeaveServerConfirmOpen(true), separated: true },
      ]
    : []

  /* ---------- Servidores: canales, o un canal abierto ---------- */
  const serversContent = () => {
    if (!serversLoaded && servers.length === 0) {
      return (
        <Screen title="Servidores">
          <Padded>
            <Skeleton lines={5} label="Cargando servidores" />
          </Padded>
        </Screen>
      )
    }

    if (servers.length === 0) {
      return (
        <Screen title="Servidores">
          <Padded>
            <EmptyState title="todavía no estás en ningún servidor" hint="creá uno o entrá con una invitación" />
            <View style={styles.links}>
              <ActionLink
                onPress={() => {
                  setCreateServerMode('create')
                  setCreateServerModalOpen(true)
                }}
              >
                crear servidor
              </ActionLink>
              <ActionLink
                onPress={() => {
                  setCreateServerMode('join')
                  setCreateServerModalOpen(true)
                }}
              >
                unirme con una invitación
              </ActionLink>
            </View>
          </Padded>
        </Screen>
      )
    }

    if (screen === 'voice' && voice.channelId) {
      return (
        <Pane backLabel={server?.name ?? 'Servidores'} onBack={() => setScreen('channels')}>
          <VoiceScreen
            channelName={voiceLocation?.channel.name ?? 'Canal de voz'}
            serverName={voiceLocation?.server.name}
            connectionState={voice.connectionState}
            participants={voiceParticipants}
            onInvite={canInvite ? () => setInviteModalOpen(true) : undefined}
            onLongPressParticipant={p => setVoiceActionTarget({ id: p.id, name: p.name })}
          />
        </Pane>
      )
    }

    if (screen === 'chat' && channel) {
      return (
        <Pane backLabel={server?.name ?? 'Servidores'} onBack={() => setScreen('channels')}>
          <ChatHeader
            channelName={channel.name}
            socketConnected={activeSocketChannelId ? socket.isConnected : undefined}
            onOpenSettings={() => handleOpenEditChannel(channel)}
          />
          <MessageList
            channelName={channel.name}
            messages={channelMessages}
            describeUser={describeUser}
            hasOlder={!!hasOlderMessages[channel.id]}
            loadingOlder={!!loadingOlderMessages[channel.id]}
            onLoadOlder={() => {
              fetchOlderChannelMessages(channel.id).catch(() =>
                showToast('No se pudieron cargar los mensajes anteriores', 'error'),
              )
            }}
            onPressAuthor={openProfile}
          />
          <Composer
            channelName={channel.name}
            value={draft}
            onChangeText={setDraft}
            onSend={handleSend}
            blockedMessage={chatBlockedMessage}
            attachment={pendingAttachment}
            onAttach={handlePickAttachment}
            onRemoveAttachment={() => setPendingAttachment(null)}
            isUploading={isUploadingAttachment}
          />
        </Pane>
      )
    }

    return (
      <Screen title={server?.name ?? 'Servidores'} tinted scroll={false}>
        {server ? (
          <>
            <ServerMenu onInvite={canInvite ? () => setInviteModalOpen(true) : undefined} items={serverMenuItems} />
            <ChannelList
              categories={server.categories}
              collapsed={collapsed}
              selectedChannelId={selectedChannelId}
              onToggleCategory={toggleCategory}
              onAddChannel={canManageChannels ? handleAddChannel : undefined}
              onSelectChannel={handleSelectChannel}
              onLongPressChannel={handleOpenEditChannel}
              isChannelLocked={isChannelLocked}
              voiceParticipants={sidebarVoiceParticipants}
              currentUserId={currentUserId}
              onLongPressVoiceParticipant={p => setVoiceActionTarget({ id: p.id, name: p.name })}
              reorderMode={reorderMode}
              onShiftChannel={handleShiftChannel}
              onShiftCategory={handleShiftCategory}
            />
          </>
        ) : (
          <Padded>
            <Skeleton lines={5} label="Cargando canales" />
          </Padded>
        )}
      </Screen>
    )
  }

  const showBars = !keyboardVisible

  return (
    <View style={styles.root}>
      <Background />
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        {tab === 'servers' && (
          <ServerTabsRow
            servers={servers}
            activeServerId={server?.id}
            onSelect={pickServer}
            onAdd={() => {
              setCreateServerMode('create')
              setCreateServerModalOpen(true)
            }}
            onJoin={() => {
              setCreateServerMode('join')
              setCreateServerModalOpen(true)
            }}
          />
        )}

        <KeyboardAvoidingView style={styles.content} behavior={keyboardAvoidingBehavior}>
          {tab === 'servers' && serversContent()}

          {tab === 'messages' && (
            <FriendsTab
              openUserId={dmUserId}
              inboxConnected={inbox.isConnected}
              onOpenChat={setDmUserId}
              onCloseChat={() => setDmUserId(null)}
              onOpenProfile={openProfile}
            />
          )}

          {tab === 'notifications' && (
            <Screen title="Notificaciones">
              <Padded>
                <EmptyState title="por ahora no hay notificaciones" hint="próximamente: menciones e invitaciones" />
              </Padded>
            </Screen>
          )}

          {tab === 'profile' && (
            <ProfileTab
              user={me}
              inCall={!!voice.channelId}
              onEditProfile={() => setEditProfileOpen(true)}
              onOpenSettings={() => setUserSettingsOpen(true)}
              onLogout={() => setLogoutConfirmOpen(true)}
            />
          )}

          <Toast />
        </KeyboardAvoidingView>

        {showBars && voice.channelId && (
          <CallBar
            channelName={voiceLocation?.channel.name ?? 'Canal de voz'}
            serverName={voiceLocation?.server.name}
            connectionState={voice.connectionState}
            isMuted={voice.isMuted}
            isDeafened={voice.isDeafened}
            onOpen={openVoice}
            onToggleMute={voice.toggleMute}
            onToggleDeafen={voice.toggleDeafen}
            onDisconnect={handleDisconnectVoice}
            isCameraOn={voice.isCameraOn}
            onToggleCamera={isVoiceSupported ? handleToggleCamera : undefined}
            cannotSpeak={!voice.canSpeak}
            cannotUseCamera={!voice.canVideo}
            onBlocked={message => showToast(message, 'info')}
          />
        )}
        {showBars && <BottomTabs value={tab} onChange={goTo} unread={{ messages: inbox.unread > 0 }} />}
      </SafeAreaView>

      <ConnectionBanner
        active={(!!activeSocketChannelId && screen === 'chat' && socket.isReconnecting) || (!!dmUserId && inbox.isReconnecting)}
      />

      <CreateServerModal
        visible={createServerModalOpen}
        initialMode={createServerMode}
        onClose={() => setCreateServerModalOpen(false)}
      />
      {server && (
        <CreateChannelModal
          visible={createChannelModalOpen}
          serverId={server.id}
          categories={server.categories}
          categoryId={channelModalCategoryId}
          onClose={() => setCreateChannelModalOpen(false)}
        />
      )}
      {server && (
        <CreateCategoryModal visible={createCategoryModalOpen} serverId={server.id} onClose={() => setCreateCategoryModalOpen(false)} />
      )}
      {server && (
        <ServerSettingsScreen
          visible={serverSettings !== null}
          initialSection={serverSettings ?? 'overview'}
          server={server}
          currentUserId={currentUserId}
          onClose={() => setServerSettings(null)}
          // En iOS un modal no se presenta encima de otro que no lo contiene: los ajustes se cierran antes
          onInvite={
            canInvite
              ? () => {
                  setServerSettings(null)
                  setInviteModalOpen(true)
                }
              : undefined
          }
          onDeleteServer={() => {
            setServerSettings(null)
            setDeleteServerConfirmOpen(true)
          }}
          onLeaveServer={() => {
            setServerSettings(null)
            setLeaveServerConfirmOpen(true)
          }}
          onOpenProfile={userId => {
            setServerSettings(null)
            openProfile(userId)
          }}
        />
      )}
      <UserSettingsScreen
        visible={userSettingsOpen}
        onClose={() => setUserSettingsOpen(false)}
        // Los ajustes se cierran antes de abrir otro modal (iOS no presenta uno encima de otro que no lo contiene)
        onEditProfile={() => {
          setUserSettingsOpen(false)
          setEditProfileOpen(true)
        }}
        onLogout={() => {
          setUserSettingsOpen(false)
          setLogoutConfirmOpen(true)
        }}
      />
      <EditProfileModal visible={editProfileOpen} onClose={() => setEditProfileOpen(false)} />
      <PublicProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} onMessage={openDirectMessage} />
      <InviteModal visible={inviteModalOpen} server={server || undefined} onClose={() => setInviteModalOpen(false)} />

      {channelActionModals}
      {voiceParticipantActions}

      <ConfirmModal
        visible={leaveServerConfirmOpen}
        title="¿Abandonar servidor?"
        message={`Vas a salir de ${server?.name ?? 'este servidor'}. Para volver vas a necesitar otra invitación.`}
        confirmLabel="Abandonar"
        tone="danger"
        onCancel={() => setLeaveServerConfirmOpen(false)}
        onConfirm={async () => {
          if (!server) return
          setLeaveServerConfirmOpen(false)
          try {
            await leaveServer(server.id)
            setServerSettings(null)
            showToast('Abandonaste el servidor', 'success')
            const remaining = servers.filter(s => s.id !== server.id)
            selectServer(remaining.length > 0 ? remaining[0].id : null)
            selectChannel(null)
          } catch {
            showToast('Error al abandonar el servidor', 'error')
          }
        }}
      />
      <ConfirmModal
        visible={deleteServerConfirmOpen}
        title="¿Eliminar servidor?"
        message={`Se borra ${server?.name ?? 'el servidor'} con todos sus canales, mensajes y roles. No se puede deshacer.`}
        confirmLabel="Eliminar"
        tone="danger"
        requireText={server?.name}
        onCancel={() => setDeleteServerConfirmOpen(false)}
        onConfirm={async () => {
          if (!server) return
          try {
            await deleteServer(server.id)
            setDeleteServerConfirmOpen(false)
            setServerSettings(null)
            showToast(`Servidor ${server.name} eliminado`, 'success')
            const remaining = servers.filter(s => s.id !== server.id)
            selectServer(remaining.length > 0 ? remaining[0].id : null)
            selectChannel(null)
          } catch (err) {
            showToast(
              errorMessageFor(err, { 403: 'Solo quien creó el servidor puede eliminarlo.' }, 'No se pudo eliminar el servidor.'),
              'error',
            )
          }
        }}
      />
      <ConfirmModal
        visible={!!pendingVoiceSwitch}
        title="¿Cambiar de canal?"
        message={`Estás conectado a •${voiceLocation?.channel.name ?? 'otro canal de voz'}. Si entrás a •${pendingVoiceSwitch?.name ?? ''}, salís de ese canal.`}
        confirmLabel="Cambiar"
        onCancel={() => setPendingVoiceSwitch(null)}
        onConfirm={() => {
          const target = pendingVoiceSwitch
          setPendingVoiceSwitch(null)
          if (target) handleJoinVoiceChannel(target)
        }}
      />
      <ConfirmModal
        visible={logoutConfirmOpen}
        title="¿Cerrar sesión?"
        message="Vas a salir de Discordia en este dispositivo."
        confirmLabel="Cerrar sesión"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false)
          voice.leave()
          logout()
        }}
      />
    </View>
  )
}

const useStyles = makeStyles(t => ({
  root: { flex: 1 },
  content: { flex: 1 },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: t.space[5], rowGap: t.space[2] },
}))
