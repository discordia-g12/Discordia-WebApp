import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../theme'
import type { Category, Channel } from '../types'
import ChannelRow from './ChannelRow'

interface CategorySectionProps {
    category: Category
    collapsed: boolean
    selectedChannelId: string | null
    onToggle: (categoryId: string) => void
    onAddChannel: (categoryId: string) => void
    onSelectChannel: (channel: Channel) => void
    onLongPressChannel: (channel: Channel) => void
}

// Categoria (ej: GENERAL) colapsable
export default function CategorySection({
    category,
    collapsed,
    selectedChannelId,
    onToggle,
    onAddChannel,
    onSelectChannel,
    onLongPressChannel,
}: CategorySectionProps) {
    return (
        <View style={styles.section}>
            <View style={styles.headerRow}>
                <Pressable style={styles.header} onPress={() => onToggle(category.id)}>
                    {collapsed ? (
                        <ChevronRight color={colors.textMuted} size={12} />
                    ) : (
                        <ChevronDown color={colors.textMuted} size={12} />
                    )}
                    <Text style={styles.title}>{category.name}</Text>
                </Pressable>
                <Pressable
                    style={styles.addButton}
                    onPress={() => onAddChannel(category.id)}
                    hitSlop={8}
                >
                    <Plus color={colors.textMuted} size={14} />
                </Pressable>
            </View>
            {!collapsed &&
                category.channels.map(ch => (
                    <ChannelRow
                        key={ch.id}
                        channel={ch}
                        active={selectedChannelId === ch.id}
                        onPress={onSelectChannel}
                        onLongPress={onLongPressChannel}
                    />
                ))}
        </View>
    )
}

const styles = StyleSheet.create({
    section: { marginBottom: spacing.sm },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: spacing.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    title: { ...typography.sectionTitle, color: colors.textMuted },
    addButton: {
        padding: spacing.xs,
        borderRadius: radii.sm,
    },
})