import React, { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth, useData, useUI } from '../providers/AppProviders'
import { colors, typography } from '../theme'
import type { Channel, Message } from '../types'
import { useChannelSocket } from '../hooks/useChannelSocket'
import ChannelActionModals from './channels/ChannelActionModals'
import ChannelList from './channels/ChannelList'
import ChatHeader from './chat/ChatHeader'
import Composer from './chat/Composer'
import ConfirmModal from './shared/ConfirmModal'
import InviteModal from './servers/InviteModal'
import CreateChannelModal from './channels/CreateChannelModal'
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
import { useVoiceRoom } from '../hooks/useVoiceRoom'
import { useUserProfiles } from '../hooks/useUserProfiles'
import { isVoiceSupported } from '../utils/voice'
import { ApiError } from '@shared/api/errors'

type MobileScreen = 'sidebar' | 'chat' | 'voice'

// Color estable para el avatar de usuarios que la app no tiene cargados
const AVATAR_COLORS = ['#7c5cfc', '#3db57a', '#f5a623', '#5865f2', '#ed4245', '#ff73fa']
function colorFor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function MobileShell() {
  const { logout, token } = useAuth()
  const {
    users,
    servers,
    messages,
    notifications,
    currentUserId,
    sendMessage,
    fetchChannelMessages,
    leaveServer,
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

  // Participantes de LiveKit -> nombre y color (la identidad es el user ID)
  const unknownVoiceUserIds = voice.participants.map(p => p.id).filter(id => !users[id])
  const voiceProfiles = useUserProfiles(unknownVoiceUserIds)
  const voiceParticipants: VoiceScreenParticipant[] = voice.participants.map(p => {
    const known = users[p.id]
    return {
      id: p.id,
      name: known?.name ?? voiceProfiles[p.id]?.name ?? 'Usuario',
      color: known?.color ?? colorFor(p.id),
      isLocal: p.isLocal,
      isSpeaking: p.isSpeaking,
      isMuted: p.isMuted,
    }
  })

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

  const socket = useChannelSocket({
    channelId: activeSocketChannelId,
    token,
    currentUserId,
    lastMessageIdSeen: lastMessageId,
    onMessageReceived: payload => {
      if (channel) {
        confirmOptimisticMessage(channel.id, payload)
      }
    },
    onErrorReceived: errMsg => {
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
      handleJoinVoiceChannel(ch)
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

  // La categoría virtual 'default' (canales sin categoría) se manda al backend como null.
  const handleAddChannel = (categoryId: string | null) => {
    setChannelModalCategoryId(categoryId === 'default' ? null : categoryId)
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
      const sent = socket.sendMessage(trimmed)
      if (!sent) {
        failOptimisticMessage(channel.id)
        showToast('No se pudo enviar el mensaje por WebSocket.', 'error')
      }
    } else {
      sendMessage(channel.id, trimmed)
    }
  }

  const channelActionModals = (
    <ChannelActionModals
      serverId={server?.id}
      channel={targetChannelForAction}
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
        <RolesModal
          visible={rolesModalOpen}
          serverId={server?.id ?? null}
          onClose={() => setRolesModalOpen(false)}
        />
        <MembersModal
          visible={membersModalOpen}
          serverId={server?.id ?? null}
          ownerId={server?.ownerId ?? null}
          onClose={() => setMembersModalOpen(false)}
        />
        <ProfileModal visible={isProfileVisible} onClose={() => setIsProfileVisible(false)} />

        {channelActionModals}


        
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
        />
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
          <MessageList messages={channelMessages} users={users} />
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