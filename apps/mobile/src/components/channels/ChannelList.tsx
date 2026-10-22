import React from 'react'
import { FlatList } from 'react-native'
import { spacing } from '../../theme'
import type { Category, Channel } from '../../types'
import CategorySection from './CategorySection'
import type { VoiceChannelParticipant } from './VoiceChannelParticipants'

interface ChannelListProps {
    categories: Category[]
    collapsed: Record<string, boolean>
    selectedChannelId: string | null
    onToggleCategory: (categoryId: string) => void
    onAddChannel: (categoryId: string) => void
    onSelectChannel: (channel: Channel) => void
    onLongPressChannel: (channel: Channel) => void
    voiceParticipants?: Record<string, VoiceChannelParticipant[]>
    currentUserId?: string
    onLongPressVoiceParticipant?: (participant: VoiceChannelParticipant) => void
    reorderMode?: boolean
    onShiftChannel?: (channelId: string, direction: -1 | 1) => void
    onShiftCategory?: (categoryId: string, direction: -1 | 1) => void
}

// Categorias del servidor (con canales colapsados o no)
export default function ChannelList({
    categories,
    collapsed,
    selectedChannelId,
    onToggleCategory,
    onAddChannel,
    onSelectChannel,
    onLongPressChannel,
    voiceParticipants,
    currentUserId,
    onLongPressVoiceParticipant,
    reorderMode,
    onShiftChannel,
    onShiftCategory,
}: ChannelListProps) {
    return (
        <FlatList
            data={categories}
            keyExtractor={(c: Category) => c.id}
            extraData={[voiceParticipants, reorderMode]}
            contentContainerStyle={{ paddingBottom: spacing.md }}
            renderItem={({ item: category }) => (
                <CategorySection
                    category={category}
                    collapsed={!!collapsed[category.id]}
                    selectedChannelId={selectedChannelId}
                    onToggle={onToggleCategory}
                    onAddChannel={onAddChannel}
                    onSelectChannel={onSelectChannel}
                    onLongPressChannel={onLongPressChannel}
                    voiceParticipants={voiceParticipants}
                    currentUserId={currentUserId}
                    onLongPressVoiceParticipant={onLongPressVoiceParticipant}
                    reorderMode={reorderMode}
                    onShiftChannel={onShiftChannel}
                    onShiftCategory={onShiftCategory}
                />
            )}
        />
    )
}