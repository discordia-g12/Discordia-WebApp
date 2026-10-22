import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MessageCircle, Plus } from 'lucide-react-native'
import { colors, radii, spacing } from '../../theme'
import type { Server } from '../../types'
import Avatar from '../shared/Avatar'

const RAIL_WIDTH = 72

interface ServerRailProps {
    servers: Server[]
    activeServerId?: string
    onSelectServer: (serverId: string) => void
    onAddServer: () => void
}

// Listados de servidores
export default function ServerRail({
    servers,
    activeServerId,
    onSelectServer,
    onAddServer,
}: ServerRailProps) {
    return (
        <View style={styles.rail}>
            <Pressable style={styles.homeButton}>
                <MessageCircle color={colors.text} size={20} />
            </Pressable>
            <View style={styles.divider} />
            <ScrollView showsVerticalScrollIndicator={false}>
                {servers.map(s => {
                    const active = s.id === activeServerId
                    return (
                        <Pressable key={s.id} style={styles.itemRow} onPress={() => onSelectServer(s.id)}>
                            <View style={[styles.indicator, active && styles.indicatorActive]} />
                            <Avatar label={s.name} color={s.color} size={48} fontSize={18} />
                            {!!s.mentions && (
                                <View style={styles.mentionBadge}>
                                    <Text style={styles.mentionBadgeText}>{s.mentions}</Text>
                                </View>
                            )}
                            {!s.mentions && s.unread && <View style={styles.unreadDot} />}
                        </Pressable>
                    )
                })}
                <Pressable style={styles.addButton} onPress={onAddServer}>
                    <Plus color={colors.online} size={20} />
                </Pressable>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    rail: {
        width: RAIL_WIDTH,
        backgroundColor: colors.rail,
        alignItems: 'center',
        paddingTop: spacing.md,
    },
    homeButton: {
        width: 48,
        height: 48,
        borderRadius: radii.full,
        backgroundColor: colors.elevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        width: 32,
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.sm,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    indicator: {
        width: 4,
        height: 24,
        borderRadius: radii.full,
        backgroundColor: 'transparent',
        marginRight: 6,
    },
    indicatorActive: { backgroundColor: colors.text },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: radii.full,
        backgroundColor: colors.elevated,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    mentionBadge: {
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
    mentionBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    unreadDot: {
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
})