import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus } from 'lucide-react-native'
import { isLocalCategoryId } from '@shared/api/channelLayout'
import { colors, radii, spacing, typography } from '../../theme'
import type { Category, Channel } from '../../types'
import ChannelRow from './ChannelRow'
import VoiceChannelParticipants, { type VoiceChannelParticipant } from './VoiceChannelParticipants'

interface CategorySectionProps {
    category: Category
    collapsed: boolean
    selectedChannelId: string | null
    onToggle: (categoryId: string) => void
    onAddChannel: (categoryId: string) => void
    onSelectChannel: (channel: Channel) => void
    onLongPressChannel: (channel: Channel) => void
    /** Participantes conectados a cada canal de voz, por channelId. */
    voiceParticipants?: Record<string, VoiceChannelParticipant[]>
    currentUserId?: string
    onLongPressVoiceParticipant?: (participant: VoiceChannelParticipant) => void
    /** Modo ordenar: muestra flechas para subir/bajar canales y la categoría. */
    reorderMode?: boolean
    onShiftChannel?: (channelId: string, direction: -1 | 1) => void
    onShiftCategory?: (categoryId: string, direction: -1 | 1) => void
}

// Flechas de subir/bajar del modo ordenar
function ShiftButtons({ label, onShift }: { label: string; onShift: (direction: -1 | 1) => void }) {
    return (
        <View style={styles.shiftButtons}>
            <Pressable
                style={styles.shiftButton}
                onPress={() => onShift(-1)}
                hitSlop={6}
                accessibilityLabel={`Subir ${label}`}
            >
                <ArrowUp color={colors.textMuted} size={16} />
            </Pressable>
            <Pressable
                style={styles.shiftButton}
                onPress={() => onShift(1)}
                hitSlop={6}
                accessibilityLabel={`Bajar ${label}`}
            >
                <ArrowDown color={colors.textMuted} size={16} />
            </Pressable>
        </View>
    )
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
    voiceParticipants = {},
    currentUserId,
    onLongPressVoiceParticipant,
    reorderMode = false,
    onShiftChannel,
    onShiftCategory,
}: CategorySectionProps) {
    // La sección general es local: no se reordena, siempre va primero
    const canShiftCategory = reorderMode && !!onShiftCategory && !isLocalCategoryId(category.id)

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
                {canShiftCategory ? (
                    <ShiftButtons
                        label={`la categoría ${category.name}`}
                        onShift={direction => onShiftCategory!(category.id, direction)}
                    />
                ) : (
                    !reorderMode && (
                        <Pressable
                            style={styles.addButton}
                            onPress={() => onAddChannel(category.id)}
                            hitSlop={8}
                        >
                            <Plus color={colors.textMuted} size={14} />
                        </Pressable>
                    )
                )}
            </View>
            {!collapsed &&
                category.channels.map(ch => (
                    <View key={ch.id}>
                        <View style={styles.channelRow}>
                            <View style={styles.channelRowMain}>
                                <ChannelRow
                                    channel={ch}
                                    active={selectedChannelId === ch.id}
                                    onPress={onSelectChannel}
                                    onLongPress={onLongPressChannel}
                                />
                            </View>
                            {reorderMode && onShiftChannel && (
                                <ShiftButtons
                                    label={`el canal ${ch.name}`}
                                    onShift={direction => onShiftChannel(ch.id, direction)}
                                />
                            )}
                        </View>
                        {ch.type === 'voice' && (
                            <VoiceChannelParticipants
                                participants={voiceParticipants[ch.id] ?? []}
                                currentUserId={currentUserId}
                                onLongPressParticipant={onLongPressVoiceParticipant}
                            />
                        )}
                    </View>
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
    channelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    channelRowMain: { flex: 1 },
    shiftButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: spacing.sm,
    },
    shiftButton: {
        padding: spacing.xs,
        borderRadius: radii.sm,
    },
})