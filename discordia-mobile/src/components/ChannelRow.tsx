import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Hash, Volume2 } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../theme'
import type { Channel } from '../types'

interface ChannelRowProps {
    channel: Channel
    active: boolean
    onPress: (channel: Channel) => void
    onLongPress: (channel: Channel) => void
}

// Fila de UN canal
export default function ChannelRow({ channel, active, onPress, onLongPress }: ChannelRowProps) {
    const unread = !!channel.unread || !!channel.mentions

    return (
        <Pressable
            style={[styles.row, active && styles.rowActive]}
            onPress={() => onPress(channel)}
            onLongPress={() => onLongPress(channel)}
            delayLongPress={350}
        >
            {channel.type === 'voice' ? (
                <Volume2 color={colors.textMuted} size={18} />
            ) : (
                <Hash color={colors.textMuted} size={18} />
            )}
            <Text style={[styles.name, unread && styles.nameUnread, active && styles.nameActive]}>
                {channel.name}
            </Text>
            {!!channel.mentions && (
                <View style={styles.mentionBadge}>
                    <Text style={styles.mentionBadgeText}>{channel.mentions}</Text>
                </View>
            )}
            {!channel.mentions && !!channel.unread && <View style={styles.unreadDot} />}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: 9,
        paddingHorizontal: spacing.md,
        marginHorizontal: spacing.xs,
        borderRadius: radii.sm,
    },
    rowActive: { backgroundColor: colors.surfaceHover },
    name: { ...typography.messageText, color: colors.textMuted, flex: 1 },
    nameUnread: { color: colors.text, fontWeight: '600' },
    nameActive: { color: colors.text },
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
})