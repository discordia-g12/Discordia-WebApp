import React from 'react'
import type { Category, Channel } from '../../types'
import EditChannelModal from './EditChannelModal'
import DeleteChannelModal from './DeleteChannelModal'

interface ChannelActionModalsProps {
    serverId?: string
    channel: Channel | null
    categories?: Category[]
    editVisible: boolean
    deleteVisible: boolean
    onCloseEdit: () => void
    onRequestDelete: (channel: Channel) => void
    onCloseDelete: () => void
    onDeleted: () => void
}

// Los modals del channel
export default function ChannelActionModals({
    serverId,
    channel,
    categories,
    editVisible,
    deleteVisible,
    onCloseEdit,
    onRequestDelete,
    onCloseDelete,
    onDeleted,
}: ChannelActionModalsProps) {
    if (!serverId) return null

    return (
        <>
            <EditChannelModal
                visible={editVisible}
                serverId={serverId}
                channel={channel}
                categories={categories}
                onClose={onCloseEdit}
                onRequestDelete={onRequestDelete}
            />
            <DeleteChannelModal
                visible={deleteVisible}
                serverId={serverId}
                channel={channel}
                onClose={onCloseDelete}
                onSuccess={onDeleted}
            />
        </>
    )
}