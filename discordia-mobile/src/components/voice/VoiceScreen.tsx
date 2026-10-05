import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ArrowLeft, HeadphoneOff, Headphones, Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../../theme'
import Avatar from '../shared/Avatar'
import type { VoiceConnectionState } from '../../hooks/useVoiceRoom'

export interface VoiceScreenParticipant {
  id: string
  name: string
  color: string
  isLocal: boolean
  isSpeaking: boolean
  isMuted: boolean
}

const CONNECTION_LABELS: Record<VoiceConnectionState, { label: string; color: string }> = {
  connected: { label: 'Voz conectada', color: colors.online },
  connecting: { label: 'Conectando…', color: colors.idle },
  reconnecting: { label: 'Reconectando…', color: colors.idle },
  disconnected: { label: 'Desconectado', color: colors.danger },
}

interface VoiceScreenProps {
  channelName: string
  serverName?: string
  connectionState: VoiceConnectionState
  participants: VoiceScreenParticipant[]
  isMuted: boolean
  isDeafened: boolean
  onToggleMute: () => void
  onToggleDeafen: () => void
  onDisconnect: () => void
  /** Vuelve a la lista de canales sin salir del canal de voz. */
  onBack: () => void
}

// Sala de voz: participantes (quién habla, quién está silenciado) y controles
export default function VoiceScreen({
  channelName,
  serverName,
  connectionState,
  participants,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onDisconnect,
  onBack,
}: VoiceScreenProps) {
  const connection = CONNECTION_LABELS[connectionState]

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Volver a los canales">
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Volume2 color={colors.textMuted} size={16} />
          <Text style={styles.title} numberOfLines={1}>
            {channelName}
          </Text>
          {!!serverName && (
            <Text style={styles.serverName} numberOfLines={1}>
              / {serverName}
            </Text>
          )}
        </View>
        <View style={styles.connection}>
          <View style={[styles.connectionDot, { backgroundColor: connection.color }]} />
          <Text style={[styles.connectionLabel, { color: connection.color }]}>{connection.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {participants.map(p => (
          <View
            key={p.id}
            style={[styles.tile, p.isSpeaking && styles.tileSpeaking]}
            accessibilityLabel={`${p.name}${p.isSpeaking ? ', hablando' : ''}${p.isMuted ? ', micrófono silenciado' : ''}`}
          >
            <View style={[styles.avatarRing, p.isSpeaking && styles.avatarRingSpeaking]}>
              <Avatar label={p.name} color={p.color} size={64} fontSize={26} />
            </View>
            <View style={styles.nameRow}>
              {p.isMuted ? (
                <MicOff color={colors.danger} size={14} />
              ) : (
                <Mic color={p.isSpeaking ? colors.online : colors.textMuted} size={14} />
              )}
              <Text style={styles.name} numberOfLines={1}>
                {p.name}
                {p.isLocal ? ' (Tú)' : ''}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.controls}>
        <Pressable
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={onToggleMute}
          accessibilityLabel={isMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
        >
          {isMuted ? <MicOff color={colors.accentFg} size={22} /> : <Mic color={colors.text} size={22} />}
        </Pressable>
        <Pressable
          style={[styles.controlButton, isDeafened && styles.controlButtonActive]}
          onPress={onToggleDeafen}
          accessibilityLabel={isDeafened ? 'Reactivar audio' : 'Ensordecer'}
        >
          {isDeafened ? (
            <HeadphoneOff color={colors.accentFg} size={22} />
          ) : (
            <Headphones color={colors.text} size={22} />
          )}
        </Pressable>
        <Pressable style={styles.leaveButton} onPress={onDisconnect} accessibilityLabel="Desconectar">
          <PhoneOff color={colors.accentFg} size={20} />
          <Text style={styles.leaveLabel}>Desconectar</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { ...typography.channelName, color: colors.text, flexShrink: 1 },
  serverName: { ...typography.metadata, color: colors.textMuted, flexShrink: 1 },
  connection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connectionDot: { width: 8, height: 8, borderRadius: radii.full },
  connectionLabel: { ...typography.metadata, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.lg,
  },
  tile: {
    width: '47%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileSpeaking: { borderWidth: 2, borderColor: colors.online },
  avatarRing: { padding: 3, borderRadius: radii.full, borderWidth: 3, borderColor: 'transparent' },
  avatarRingSpeaking: { borderColor: colors.online },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    maxWidth: '100%',
  },
  name: { ...typography.username, fontSize: 14, color: colors.text, flexShrink: 1 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.sidebar,
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  controlButtonActive: { backgroundColor: colors.danger },
  leaveButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    backgroundColor: colors.danger,
  },
  leaveLabel: { ...typography.button, color: colors.accentFg },
})
