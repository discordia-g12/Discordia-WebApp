import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ArrowLeft, Hash, Settings } from 'lucide-react-native'
import { colors, spacing, typography } from '../../theme'

interface ChatHeaderProps {
    channelName: string
    socketConnected?: boolean
    onBack: () => void
    onOpenSettings: () => void
}

// Volver, nombre canal y ajustes
export default function ChatHeader({
    channelName,
    socketConnected,
    onBack,
    onOpenSettings,
}: ChatHeaderProps) {
    return (
        <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={12}>
                <ArrowLeft color={colors.text} size={20} />
            </Pressable>
            <View style={styles.channel}>
                <Hash color={colors.textMuted} size={16} />
                <Text style={styles.title}>{channelName}</Text>
                {socketConnected !== undefined && (
                    <View
                        style={[
                            styles.socketDot,
                            { backgroundColor: socketConnected ? colors.online : colors.idle },
                        ]}
                    />
                )}
            </View>
            <Pressable onPress={onOpenSettings} hitSlop={12}>
                <Settings color={colors.textMuted} size={18} />
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: { ...typography.channelName, color: colors.text },
    channel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    socketDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: spacing.xs,
    },
})