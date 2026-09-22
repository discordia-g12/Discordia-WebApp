import React, { useMemo, useState } from 'react'
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ChevronRight,
  Hash,
  Mic,
  MicOff,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Send,
  UserPlus,
  Volume2,
} from 'lucide-react-native'
import { useAuth, useData, useUI } from '../providers/AppProviders'
import { colors, radii, spacing, typography } from '../theme'
import { statusColor } from '../theme/colors'
import type { Category, Channel, Message } from '../types'
import CreateServerModal from './CreateServerModal'
import CreateChannelModal from './CreateChannelModal'

type MobileScreen = 'sidebar' | 'chat'

const RAIL_WIDTH = 72

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
  } = useData()
  const {
    selectedServerId,
    selectedChannelId,
    selectServer,
    selectChannel,
    micMuted,
    toggleMic,
  } = useUI()
  const [screen, setScreen] = useState<MobileScreen>('sidebar')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState('')
  const [createServerModalOpen, setCreateServerModalOpen] = useState(false)
  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false)
  const [channelModalCategoryId, setChannelModalCategoryId] = useState<string | null>(null)

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

  const handleSelectServer = (id: string) => selectServer(id)

  const handleSelectChannel = (ch: Channel) => {
    selectChannel(ch.id)
    fetchChannelMessages(ch.id)
    if (ch.type !== 'voice') setScreen('chat')
  }

  const toggleCategory = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const handleSend = () => {
    if (!channel || !draft.trim()) return
    sendMessage(channel.id, draft.trim())
    setDraft('')
  }

  /* ---------- pantalla: rail + sidebar del servidor (estilo Discord) ---------- */
  if (screen === 'sidebar') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.shellRow}>
          {/* Nivel 1 — server rail */}
          <View style={styles.rail}>
            <Pressable style={styles.railHomeButton}>
              <MessageCircle color={colors.text} size={20} />
            </Pressable>
            <View style={styles.railDivider} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {servers.map(s => {
                const active = s.id === server?.id
                return (
                  <Pressable
                    key={s.id}
                    style={styles.railItemRow}
                    onPress={() => handleSelectServer(s.id)}
                  >
                    <View style={[styles.railIndicator, active && styles.railIndicatorActive]} />
                    <View style={[styles.serverIcon, { backgroundColor: s.color }]}>
                      <Text style={styles.serverIconText}>{s.name.charAt(0)}</Text>
                    </View>
                    {!!s.mentions && (
                      <View style={styles.railMentionBadge}>
                        <Text style={styles.mentionBadgeText}>{s.mentions}</Text>
                      </View>
                    )}
                    {!s.mentions && s.unread && <View style={styles.railUnreadDot} />}
                  </Pressable>
                )
              })}
              <Pressable
                style={styles.railAddButton}
                onPress={() => setCreateServerModalOpen(true)}
              >
                <Plus color={colors.online} size={20} />
              </Pressable>
            </ScrollView>
          </View>

          {/* Nivel 2 — sidebar del servidor */}
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle} numberOfLines={1}>
                {server?.name}
              </Text>
              {server && (
                <Pressable
                  style={styles.addChannelButton}
                  onPress={() => {
                    setChannelModalCategoryId(null)
                    setCreateChannelModalOpen(true)
                  }}
                  hitSlop={8}
                >
                  <Plus color={colors.textMuted} size={18} />
                </Pressable>
              )}
            </View>

            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search color={colors.textMuted} size={15} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar"
                  placeholderTextColor={colors.textMuted}
                  editable={false}
                />
              </View>
              <Pressable style={styles.iconButton}>
                <UserPlus color={colors.text} size={18} />
              </Pressable>
            </View>

            <FlatList
              data={server?.categories ?? []}
              keyExtractor={(c: Category) => c.id}
              contentContainerStyle={{ paddingBottom: spacing.md }}
              renderItem={({ item: category }) => {
                const isCollapsed = collapsed[category.id]
                return (
                  <View style={{ marginBottom: spacing.sm }}>
                    <View style={styles.categoryHeaderRow}>
                      <Pressable
                        style={styles.categoryHeader}
                        onPress={() => toggleCategory(category.id)}
                      >
                        {isCollapsed ? (
                          <ChevronRight color={colors.textMuted} size={12} />
                        ) : (
                          <ChevronDown color={colors.textMuted} size={12} />
                        )}
                        <Text style={styles.categoryTitle}>{category.name}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.addChannelButton}
                        onPress={() => {
                          setChannelModalCategoryId(category.id === 'default' ? null : category.id)
                          setCreateChannelModalOpen(true)
                        }}
                        hitSlop={8}
                      >
                        <Plus color={colors.textMuted} size={14} />
                      </Pressable>
                    </View>
                    {!isCollapsed &&
                      category.channels.map(ch => {
                        const active = selectedChannelId === ch.id
                        const unread = !!ch.unread || !!ch.mentions
                        return (
                          <Pressable
                            key={ch.id}
                            style={[styles.channelRow, active && styles.channelRowActive]}
                            onPress={() => handleSelectChannel(ch)}
                          >
                            {ch.type === 'voice' ? (
                              <Volume2 color={colors.textMuted} size={18} />
                            ) : (
                              <Hash color={colors.textMuted} size={18} />
                            )}
                            <Text
                              style={[
                                styles.channelName,
                                unread && styles.channelNameUnread,
                                active && styles.channelNameActive,
                              ]}
                            >
                              {ch.name}
                            </Text>
                            {!!ch.mentions && (
                              <View style={styles.mentionBadge}>
                                <Text style={styles.mentionBadgeText}>{ch.mentions}</Text>
                              </View>
                            )}
                            {!ch.mentions && !!ch.unread && <View style={styles.unreadDot} />}
                          </Pressable>
                        )
                      })}
                  </View>
                )
              }}
            />

            {/* User panel inferior */}
            <View style={styles.userPanel}>
              <View style={styles.userPanelAvatarWrap}>
                <View style={[styles.userPanelAvatar, { backgroundColor: me.color }]}>
                  <Text style={styles.avatarText}>{me.name.charAt(0)}</Text>
                </View>
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor[me.status] }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.userPanelNameRow}>
                  <Text style={styles.userPanelName} numberOfLines={1}>
                    {me.name}
                  </Text>
                  <ChevronDown color={colors.textMuted} size={14} />
                </View>
                {!!me.customStatus && (
                  <Text style={styles.userPanelStatus} numberOfLines={1}>
                    {me.customStatus}
                  </Text>
                )}
              </View>
              <Pressable style={styles.iconButton}>
                <Bell color={colors.text} size={18} />
                {hasUnreadNotifications && <View style={styles.bellDot} />}
              </Pressable>
              <Pressable style={styles.iconButton} onPress={logout}>
                <LogOut color={colors.textMuted} size={18} />
              </Pressable>
            </View>
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
      </SafeAreaView>
    )
  }

  /* ---------- pantalla: chat de un canal ---------- */
  if (screen === 'chat' && channel) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.chatHeader}>
          <Pressable onPress={() => setScreen('sidebar')} hitSlop={12}>
            <ArrowLeft color={colors.text} size={20} />
          </Pressable>
          <View style={styles.headerChannel}>
            <Hash color={colors.textMuted} size={16} />
            <Text style={styles.headerTitle}>{channel.name}</Text>
          </View>
          <View style={{ width: 20 }} />
        </View>

        <FlatList
          data={channelMessages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: spacing.md }}
          renderItem={({ item }) => {
            if (item.type === 'system') {
              return <Text style={styles.systemMessage}>— {item.content} —</Text>
            }
            const author = users[item.userId]
            const deleted = item.type === 'deleted'
            return (
              <View style={styles.messageRow}>
                <View style={[styles.avatar, { backgroundColor: author?.color ?? colors.textDim }]}>
                  <Text style={styles.avatarText}>{author?.name?.charAt(0) ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.messageMetaRow}>
                    <Text style={[styles.username, { color: author?.color ?? colors.text }]}>
                      {author?.name ?? 'Usuario'}
                    </Text>
                    <Text style={styles.timestamp}>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    {item.edited && <Text style={styles.editedTag}>(editado)</Text>}
                  </View>
                  <Text style={[styles.messageText, deleted && styles.messageDeleted]}>
                    {item.content}
                  </Text>
                  {!!item.reactions?.length && (
                    <View style={styles.reactionsRow}>
                      {item.reactions.map(r => (
                        <View
                          key={r.emoji}
                          style={[styles.reactionPill, r.reacted && styles.reactionPillActive]}
                        >
                          <Text style={styles.reactionText}>
                            {r.emoji} {r.count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )
          }}
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            placeholder={`Enviar mensaje en #${channel.name}`}
            placeholderTextColor={colors.textDim}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable
            style={[styles.micButton, micMuted && styles.micButtonMuted]}
            onPress={toggleMic}
            hitSlop={8}
          >
            {micMuted ? (
              <MicOff color={colors.text} size={18} />
            ) : (
              <Mic color={colors.text} size={18} />
            )}
          </Pressable>
          <Pressable style={styles.sendButton} onPress={handleSend} hitSlop={8}>
            <Send color={colors.accentFg} size={18} />
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Pressable onPress={() => setScreen('sidebar')}>
        <Text style={styles.username}>Volver</Text>
      </Pressable>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  shellRow: { flex: 1, flexDirection: 'row' },

  /* --- rail --- */
  rail: {
    width: RAIL_WIDTH,
    backgroundColor: colors.rail,
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  railHomeButton: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railDivider: {
    width: 32,
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  railItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  railIndicator: {
    width: 4,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: 'transparent',
    marginRight: 6,
  },
  railIndicatorActive: { backgroundColor: colors.text },
  serverIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverIconText: { color: colors.accentFg, fontWeight: '700', fontSize: 18 },
  railAddButton: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  railMentionBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: colors.danger,
    borderRadius: radii.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  railUnreadDot: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.rail,
  },

  /* --- sidebar --- */
  sidebar: { flex: 1, backgroundColor: colors.sidebar },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sidebarTitle: { ...typography.channelName, color: colors.text, flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    height: 36,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
  },
  addChannelButton: {
    padding: spacing.xs,
    borderRadius: radii.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  categoryTitle: { ...typography.sectionTitle, color: colors.textMuted },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  channelRowActive: { backgroundColor: colors.surfaceHover },
  channelName: { ...typography.messageText, color: colors.textMuted, flex: 1 },
  channelNameUnread: { color: colors.text, fontWeight: '600' },
  channelNameActive: { color: colors.text },
  unreadDot: { width: 8, height: 8, borderRadius: radii.full, backgroundColor: colors.text },
  mentionBadge: {
    backgroundColor: colors.danger,
    borderRadius: radii.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  mentionBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  userPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.elevated,
  },
  userPanelAvatarWrap: { position: 'relative' },
  userPanelAvatar: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.elevated,
  },
  userPanelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userPanelName: { ...typography.username, color: colors.text },
  userPanelStatus: { ...typography.metadata, color: colors.textMuted },
  bellDot: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.danger,
  },

  /* --- chat --- */
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.channelName, color: colors.text },
  headerChannel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  systemMessage: {
    ...typography.metadata,
    color: colors.textDim,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  messageRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  messageMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  username: { ...typography.username },
  timestamp: { ...typography.metadata, color: colors.textDim },
  editedTag: { ...typography.metadata, color: colors.textDim },
  messageText: { ...typography.messageText, color: colors.text },
  messageDeleted: { color: colors.textDim, fontStyle: 'italic' },
  reactionsRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
  reactionPill: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  reactionPillActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  reactionText: { fontSize: 12, color: colors.text },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.sm,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonMuted: { backgroundColor: colors.danger },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
