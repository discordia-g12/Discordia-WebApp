import React from 'react'
import { FlatList } from 'react-native'
import { space } from '@discordia/tokens'
import type { Category, Channel } from '../../types'
import CategorySection from './CategorySection'
import type { VoiceChannelParticipant } from './VoiceChannelParticipants'

interface ChannelListProps {
    categories: Category[]
    collapsed: Record<string, boolean>
    selectedChannelId: string | null
    onToggleCategory: (categoryId: string) => void
    /** Sin permiso para gestionar canales, no se pasa y no aparece el +. */
    onAddChannel?: (categoryId: string) => void
    onSelectChannel: (channel: Channel) => void
    onLongPressChannel: (channel: Channel) => void
    /** Canales a los que el usuario no puede entrar (voz sin permiso para conectarse). */
    isChannelLocked?: (channel: Channel) => boolean
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
    isChannelLocked,
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
            contentContainerStyle={{ paddingBottom: space[6] }}
            renderItem={({ item: category }) => (
                <CategorySection
                    category={category}
                    collapsed={!!collapsed[category.id]}
                    selectedChannelId={selectedChannelId}
                    onToggle={onToggleCategory}
                    onAddChannel={onAddChannel}
                    onSelectChannel={onSelectChannel}
                    onLongPressChannel={onLongPressChannel}
                    isChannelLocked={isChannelLocked}
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