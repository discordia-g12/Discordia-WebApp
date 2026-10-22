import React, { useMemo, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth, useData, useUI } from '../providers/AppProviders'
import { colors, typography } from '../theme'
import type { Channel, Message } from '../types'
import ChannelActionModals from './channels/ChannelActionModals'
import ChannelList from './channels/ChannelList'
import ChatHeader from './chat/ChatHeader'
import Composer from './chat/Composer'
import ConfirmModal from './shared/ConfirmModal'
import InviteModal from './servers/InviteModal'
import CreateChannelModal from './channels/CreateChannelModal'
import CreateCategoryModal from './channels/CreateCategoryModal'
import CreateServerModal from './servers/CreateServerModal'
import MessageList from './chat/MessageList'
import ProfileModal from './profile/ProfileModal'
import ServerRail from './servers/ServerRail'
import ServerSidebarHeader from './servers/ServerSidebarHeader'
import SidebarSearchRow from './SidebarSearchRow'
import Toast from './shared/Toast'
import UserPanel from './profile/UserPanel'
import RolesModal from './roles/RolesModal'
import MembersModal from './members/MembersModal'
import VoiceBar from './voice/VoiceBar'
import VoiceScreen, { type VoiceScreenParticipant } from './voice/VoiceScreen'
import VoiceParticipantActions, { type VoiceParticipantTarget } from './voice/VoiceParticipantActions'
import { useUserDisplay } from '../hooks/useUserProfiles'
import type { VoiceChannelParticipant } from './channels/VoiceChannelParticipants'
import { isVoiceSupported } from '../utils/voice'
import {
  ApiError,
  errorMessageFor,
  isLocalCategoryId,
  shiftCategory,
  shiftChannel,
  useChatSocket,
  useVoicePresence,
  useVoiceRoom,
} from '@discordia/core'

type MobileScreen = 'sidebar' | 'chat' | 'voice'

export default function MobileShell() {
  const { logout } = useAuth()
  const {
    users,
    servers,
    messages,
    notifications,
    currentUserId,
    sendMessage,
    fetchChannelMessages,
    leaveServer,
    reorderChannels,
    reorderCategories,
    addOptimisticMessage,
    confirmOptimisticMessage,
    failOptimisticMessage,
  } = useData()
  const { selectedServerId, selectedChannelId, selectChannel, selectServer, showToast } = useUI()
  const [screen, setScreen] = useState<MobileScreen>('sidebar')

  // Voz (LiveKit). Si la conexión se corta sola, volver a la lista de canales
  const voice = useVoiceRoom({
    onUnexpectedDisconnect: () => {
      setScreen(current => (current === 'voice' ? 'sidebar' : current))
      showToast('Se perdió la conexión con el canal de voz', 'error')
    },
  })
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState('')
  const [createServerModalOpen, setCreateServerModalOpen] = useState(false)
  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false)
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false)
  // Modo ordenar canales y categorías (flechas subir/bajar)
  const [reorderMode, setReorderMode] = useState(false)
  // Un reorden por vez: cada pedido manda el orden completo y no deben pisarse
  const reorderInFlight = useRef(false)
  const [channelModalCategoryId, setChannelModalCategoryId] = useState<string | null>(null)
  const [rolesModalOpen, setRolesModalOpen] = useState(false)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [leaveServerConfirmOpen, setLeaveServerConfirmOpen] = useState(false)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [editChannelModalOpen, setEditChannelModalOpen] = useState(false)
  const [deleteChannelModalOpen, setDeleteChannelModalOpen] = useState(false)
  const [targetChannelForAction, setTargetChannelForAction] = useState<Channel | null>(null)
  const [isProfileVisible, setIsProfileVisible] = useState(false)
  // Canal de voz al que se quiere pasar estando conectado a otro (pide confirmación)
  const [pendingVoiceSwitch, setPendingVoiceSwitch] = useState<Channel | null>(null)
  // Participante sobre el que se mantuvo presionado (menú para silenciarlo solo para vos)
  const [voiceActionTarget, setVoiceActionTarget] = useState<VoiceParticipantTarget | null>(null)

  const server = servers.find(s => s.id === selectedServerId) ?? servers[0]
  const allChannels: Channel[] = server ? server.categories.flatMap(c => c.channels) : []
  const channel = allChannels.find(c => c.id === selectedChannelId) ?? null
  const channelMessages: Message[] = channel ? messages[channel.id] ?? [] : []
  const me = users[currentUserId] ?? {
    id: currentUserId,
    name: 'Usuario',
    username: 'usuario',
    avatar: null,
    color: colors.accent,
    status: 'online' as const,
    joinedAt: '',
  }
  const hasUnreadNotifications = useMemo(() => notifications.some(n => !n.read), [notifications])

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

  // IDs (LiveKit, presencia o autores de mensajes) -> nombre y color; los que la app no conoce se piden al backend
  const describeUser = useUserDisplay([
    ...voice.participants.map(p => p.id),
    ...Object.values(voicePresence).flat(),
    ...channelMessages.map(m => m.userId),
  ])

  const voiceParticipants: VoiceScreenParticipant[] = voice.participants.map(p => ({
    id: p.id,
    ...describeUser(p.id),
    isLocal: p.isLocal,
    isSpeaking: p.isSpeaking,
    isMuted: p.isMuted,
    isLocallyMuted: !p.isLocal && !!voice.locallyMutedUsers[p.id],
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

  const activeSocketChannelId =
    channel && channel.type !== 'voice' && !channel.id.startsWith('dm-') ? channel.id : null

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
  })

  const isServerAdmin = useMemo(() => {
    if (!server) return false
    return server.ownerId === currentUserId
  }, [server, currentUserId])

  const handleOpenEditChannel = (ch: Channel) => {
    // CA 2: Sin permisos
    if (!isServerAdmin) {
      showToast('No tienes permisos de administración para editar este canal.', 'error')
      return
    }
    setTargetChannelForAction(ch)
    setEditChannelModalOpen(true)
  }

  const handleOpenDeleteChannel = (ch: Channel) => {
    // CA 3: Sin permisos
    if (!isServerAdmin) {
      showToast('No tienes permisos de administración para eliminar este canal.', 'error')
      return
    }
    setTargetChannelForAction(ch)
    setDeleteChannelModalOpen(true)
  }

  const handleChannelDeleted = () => {
    if (targetChannelForAction && targetChannelForAction.id === selectedChannelId) {
      const remaining = allChannels.filter(c => c.id !== targetChannelForAction.id)
      if (remaining.length > 0) {
        selectChannel(remaining[0].id)
      } else {
        selectChannel(null)
        setScreen('sidebar')
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
      setScreen(current => (current === 'voice' ? 'sidebar' : current))
      showToast(
        err instanceof ApiError && err.status === 403
          ? 'No tenés permiso para entrar a este canal de voz'
          : 'No se pudo conectar al canal de voz',
        'error',
      )
    }
  }

  const handleDisconnectVoice = () => {
    voice.leave()
    setScreen(current => (current === 'voice' ? 'sidebar' : current))
    showToast('Desconectado de la llamada', 'info')
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

  const handleSend = () => {
    if (!channel) return
    const trimmed = draft.trim()

    // CA 2: Evitar envío si está vacío
    if (!trimmed) return

    // CA 4: Bloquear o advertir si supera los 2000 caracteres
    if (trimmed.length > 2000) {
      showToast('El mensaje no puede superar los 2000 caracteres.', 'error')
      return
    }

    // CA 1: Actualización optimista
    addOptimisticMessage(channel.id, trimmed)
    setDraft('')

    // Envío por WebSocket si es un canal activo, o fallback
    if (activeSocketChannelId) {
      socket.sendMessage(trimmed).catch(() => {
        failOptimisticMessage(channel.id)
        showToast('No se pudo enviar el mensaje por WebSocket.', 'error')
      })
    } else {
      sendMessage(channel.id, trimmed)
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

  /* ---------- pantalla: rail + sidebar del servidor (estilo Discord) ---------- */
  if (screen === 'sidebar') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Toast />
        <View style={styles.shellRow}>
          {/* Nivel 1 — server rail */}
          <ServerRail
            servers={servers}
            activeServerId={server?.id}
            onSelectServer={handleSelectServer}
            onAddServer={() => setCreateServerModalOpen(true)}
          />

          {/* Nivel 2 — sidebar del servidor */}
          <View style={styles.sidebar}>
            <ServerSidebarHeader
              server={server}
              canLeave={!isServerAdmin}
              onLeaveServer={() => setLeaveServerConfirmOpen(true)}
              onOpenInvite={() => setInviteModalOpen(true)}
              onOpenRoles={() => setRolesModalOpen(true)}
              onOpenMembers={() => setMembersModalOpen(true)}
              onAddChannel={() => handleAddChannel(null)}
              onAddCategory={() => setCreateCategoryModalOpen(true)}
              reorderMode={reorderMode}
              onToggleReorder={() => setReorderMode(on => !on)}
            />
            <SidebarSearchRow />
            <ChannelList
              categories={server?.categories ?? []}
              collapsed={collapsed}
              selectedChannelId={selectedChannelId}
              onToggleCategory={toggleCategory}
              onAddChannel={handleAddChannel}
              onSelectChannel={handleSelectChannel}
              onLongPressChannel={handleOpenEditChannel}
              voiceParticipants={sidebarVoiceParticipants}
              currentUserId={currentUserId}
              onLongPressVoiceParticipant={p =>
                setVoiceActionTarget({ id: p.id, name: p.name, color: p.color })
              }
              reorderMode={reorderMode}
              onShiftChannel={handleShiftChannel}
              onShiftCategory={handleShiftCategory}
            />
            {voiceLocation && (
              <VoiceBar
                channelName={voiceLocation.channel.name}
                serverName={voiceLocation.server.name}
                onOpen={() => setScreen('voice')}
                onDisconnect={handleDisconnectVoice}
              />
            )}
            <UserPanel
              user={me}
              hasUnreadNotifications={hasUnreadNotifications}
              onOpenProfile={() => setIsProfileVisible(true)}
              onLogout={() => setLogoutConfirmOpen(true)}
            />
          </View>
        </View>

        <CreateServerModal
          visible={createServerModalOpen}
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
          <CreateCategoryModal
            visible={createCategoryModalOpen}
            serverId={server.id}
            onClose={() => setCreateCategoryModalOpen(false)}
          />
        )}
        <RolesModal
          visible={rolesModalOpen}
          serverId={server?.id ?? null}
          onClose={() => setRolesModalOpen(false)}
        />
        <MembersModal
          visible={membersModalOpen}
          serverId={server?.id ?? null}
          ownerId={server?.ownerId ?? null}
          currentUserId={currentUserId}
          onClose={() => setMembersModalOpen(false)}
        />
        <ProfileModal visible={isProfileVisible} onClose={() => setIsProfileVisible(false)} />

        {channelActionModals}
        {voiceParticipantActions}

        
        <InviteModal
          visible={inviteModalOpen}
          server={server || undefined}
          onClose={() => setInviteModalOpen(false)}
        />
        <ConfirmModal
          visible={leaveServerConfirmOpen}
          title="Abandonar servidor"
          message={`¿Realmente quieres abandonar el servidor "${server?.name}"?`}
          confirmLabel="Abandonar"
          onCancel={() => setLeaveServerConfirmOpen(false)}
          onConfirm={async () => {
            if (!server) return
            setLeaveServerConfirmOpen(false)
            try {
              await leaveServer(server.id)
              showToast('Abandonaste el servidor', 'success')
              // El DataProvider actualizará 'servers' automáticamente.
              // Opcionalmente podemos seleccionar otro servidor aquí.
              const remaining = servers.filter(s => s.id !== server.id)
              selectServer(remaining.length > 0 ? remaining[0].id : null)
              selectChannel(null)
            } catch (error) {
              showToast('Error al abandonar el servidor', 'error')
            }
          }}
        />
        <ConfirmModal
          visible={!!pendingVoiceSwitch}
          title="¿Cambiar de canal de voz?"
          message={`Estás conectado a "${voiceLocation?.channel.name ?? 'otro canal'}". Si entrás a "${pendingVoiceSwitch?.name ?? ''}", vas a salir de ese canal.`}
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
          title="Cerrar sesión"
          message="¿Realmente quieres cerrar sesión?"
          confirmLabel="Cerrar sesión"
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => {
            setLogoutConfirmOpen(false)
            logout()
          }}
        />
      </SafeAreaView>
    )
  }

  /* ---------- pantalla: canal de voz ---------- */
  if (screen === 'voice' && voice.channelId) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Toast />
        <VoiceScreen
          channelName={voiceLocation?.channel.name ?? 'Canal de voz'}
          serverName={voiceLocation?.server.name}
          connectionState={voice.connectionState}
          participants={voiceParticipants}
          isMuted={voice.isMuted}
          isDeafened={voice.isDeafened}
          onToggleMute={voice.toggleMute}
          onToggleDeafen={voice.toggleDeafen}
          onDisconnect={handleDisconnectVoice}
          onBack={() => setScreen('sidebar')}
          onLongPressParticipant={p => setVoiceActionTarget({ id: p.id, name: p.name, color: p.color })}
        />
        {voiceParticipantActions}
      </SafeAreaView>
    )
  }

  /* ---------- pantalla: chat de un canal ---------- */
  if (screen === 'chat' && channel) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.chatKeyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Toast />
          <ChatHeader
            channelName={channel.name}
            socketConnected={activeSocketChannelId ? socket.isConnected : undefined}
            onBack={() => setScreen('sidebar')}
            onOpenSettings={() => handleOpenEditChannel(channel)}
          />
          <MessageList messages={channelMessages} describeUser={describeUser} />
          <Composer
            channelName={channel.name}
            value={draft}
            onChangeText={setDraft}
            onSend={handleSend}
          />
        </KeyboardAvoidingView>

        {channelActionModals}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => setScreen('sidebar')}>
        <Text style={styles.fallbackText}>Volver</Text>
      </Pressable>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  shellRow: { flex: 1, flexDirection: 'row' },
  sidebar: { flex: 1, backgroundColor: colors.sidebar },
  chatKeyboardAvoid: { flex: 1 },
  fallbackText: { ...typography.username },
})