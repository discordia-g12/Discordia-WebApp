import React from 'react'
import { FlatList } from 'react-native'
import { spacing } from '../theme'
import type { Category, Channel } from '../types'
import CategorySection from './CategorySection'

interface ChannelListProps {
    categories: Category[]
    collapsed: Record<string, boolean>
    selectedChannelId: string | null
    onToggleCategory: (categoryId: string) => void
    onAddChannel: (categoryId: string) => void
    onSelectChannel: (channel: Channel) => void
    onLongPressChannel: (channel: Channel) => void
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
}: ChannelListProps) {
    return (
        <FlatList
            data={categories}
            keyExtractor={(c: Category) => c.id}
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
                />
            )}
        />
    )
}