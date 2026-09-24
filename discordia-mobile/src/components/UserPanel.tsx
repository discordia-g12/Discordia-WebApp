import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Bell, ChevronDown, LogOut } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../theme'
import { statusColor } from '../theme/colors'
import type { User } from '../types'
import Avatar from './Avatar'
import IconButton from './IconButton'

interface UserPanelProps {
    user: User
    hasUnreadNotifications: boolean
    onOpenProfile: () => void
    onLogout: () => void
}

// Avatar, estado, toda la info del usuario
export default function UserPanel({
    user,
    hasUnreadNotifications,
    onOpenProfile,
    onLogout,
}: UserPanelProps) {
    return (
        <View style={styles.panel}>
            <Pressable style={styles.profileButton} onPress={onOpenProfile}>
                <Avatar label={user.name} color={user.color} statusColor={statusColor[user.status]} />
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>
                            {user.name}
                        </Text>
                        <ChevronDown color={colors.textMuted} size={14} />
                    </View>
                    {!!user.customStatus && (
                        <Text style={styles.status} numberOfLines={1}>
                            {user.customStatus}
                        </Text>
                    )}
                </View>
            </Pressable>
            <IconButton>
                <Bell color={colors.text} size={18} />
                {hasUnreadNotifications && <View style={styles.bellDot} />}
            </IconButton>
            <IconButton onPress={onLogout}>
                <LogOut color={colors.textMuted} size={18} />
            </IconButton>
        </View>
    )
}

const styles = StyleSheet.create({
    panel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.elevated,
    },
    profileButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    info: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    name: { ...typography.username, color: colors.text },
    status: { ...typography.metadata, color: colors.textMuted },
    bellDot: {
        position: 'absolute',
        right: 6,
        top: 6,
        width: 8,
        height: 8,
        borderRadius: radii.full,
        backgroundColor: colors.danger,
    },
})