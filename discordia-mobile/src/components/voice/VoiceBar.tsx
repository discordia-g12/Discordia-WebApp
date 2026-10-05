import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { PhoneOff, Volume2 } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../../theme'

interface VoiceBarProps {
  channelName: string
  serverName?: string
  /** Vuelve a la pantalla del canal de voz. */
  onOpen: () => void
  onDisconnect: () => void
}

// Barra "Voz conectada" sobre el panel de usuario mientras se está en un canal de voz
export default function VoiceBar({ channelName, serverName, onOpen, onDisconnect }: VoiceBarProps) {
  return (
    <View style={styles.bar}>
      <Pressable style={styles.info} onPress={onOpen} accessibilityLabel="Abrir el canal de voz">
        <Volume2 color={colors.online} size={18} />
        <View style={styles.texts}>
          <Text style={styles.status}>Voz conectada</Text>
          <Text style={styles.channel} numberOfLines={1}>
            {channelName}
            {serverName ? ` / ${serverName}` : ''}
          </Text>
        </View>
      </Pressable>
      <Pressable
        style={styles.disconnect}
        onPress={onDisconnect}
        hitSlop={8}
        accessibilityLabel="Desconectar del canal de voz"
      >
        <PhoneOff color={colors.danger} size={18} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(61, 181, 122, 0.3)',
    backgroundColor: 'rgba(61, 181, 122, 0.12)',
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texts: { flex: 1 },
  status: { ...typography.metadata, fontWeight: '700', color: colors.online },
  channel: { ...typography.metadata, color: colors.textMuted },
  disconnect: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
