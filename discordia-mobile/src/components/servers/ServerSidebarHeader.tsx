import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Plus, Shield, Users, LogOut, Link as LinkIcon } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../../theme'
import type { Server } from '../../types'

interface ServerSidebarHeaderProps {
    server?: Server
    onOpenRoles: () => void
    onOpenMembers: () => void
    onAddChannel: () => void
    canLeave?: boolean
    onLeaveServer?: () => void
    onOpenInvite?: () => void
}

// Nombre de server + opciones
export default function ServerSidebarHeader({
    server,
    onOpenRoles,
    onOpenMembers,
    onAddChannel,
    canLeave,
    onLeaveServer,
    onOpenInvite,
}: ServerSidebarHeaderProps) {
    return (
        <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
                {server?.name}
            </Text>
            {server && (
                <View style={styles.actions}>
                                        {onOpenInvite && (
                        <Pressable style={styles.actionButton} onPress={onOpenInvite} hitSlop={8}>
                            <LinkIcon color={colors.textMuted} size={18} />
                        </Pressable>
                    )}
                    {canLeave && onLeaveServer && (
                        <Pressable style={styles.actionButton} onPress={onLeaveServer} hitSlop={8}>
                            <LogOut color={colors.textMuted} size={18} />
                        </Pressable>
                    )}
                    <Pressable style={styles.actionButton} onPress={onOpenMembers} hitSlop={8}>
                        <Users color={colors.textMuted} size={18} />
                    </Pressable>
                    <Pressable style={styles.actionButton} onPress={onOpenRoles} hitSlop={8}>
                        <Shield color={colors.textMuted} size={18} />
                    </Pressable>
                    <Pressable style={styles.actionButton} onPress={onAddChannel} hitSlop={8}>
                        <Plus color={colors.textMuted} size={18} />
                    </Pressable>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: { ...typography.channelName, color: colors.text, flex: 1 },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    actionButton: {
        padding: spacing.xs,
        borderRadius: radii.sm,
    },
})