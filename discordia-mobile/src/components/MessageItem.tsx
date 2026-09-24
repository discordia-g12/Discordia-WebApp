import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '../theme'
import type { Message, User } from '../types'
import Avatar from './Avatar'

// Capaz se pasa a una carpeta aparte (funciones?)
export function formatMessageTimestamp(isoDate: string): string {
    const date = new Date(isoDate)
    if (isNaN(date.getTime())) return ''
    const now = new Date()
    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()

    const timeStr = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    })

    if (isToday) {
        return timeStr
    }

    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year} ${timeStr}`
}

interface MessageItemProps {
    message: Message
    author?: User
}

// Solo un msj (con reacciones, hora, usuario, etc)
function MessageItem({ message, author }: MessageItemProps) {
    if (message.type === 'system') {
        return <Text style={styles.system}>— {message.content} —</Text>
    }

    const deleted = message.type === 'deleted'
    const isPending = message.status === 'pending'
    const isFailed = message.status === 'failed'

    return (
        <View style={[styles.row, isPending && { opacity: 0.6 }]}>
            <Avatar label={author?.name ?? '?'} color={author?.color ?? colors.textDim} />
            <View style={{ flex: 1 }}>
                <View style={styles.metaRow}>
                    <Text style={[styles.username, { color: author?.color ?? colors.text }]}>
                        {author?.name ?? 'User'}
                    </Text>
                    <Text style={styles.timestamp}>{formatMessageTimestamp(message.timestamp)}</Text>
                    {message.edited && <Text style={styles.editedTag}>(edited)</Text>}
                    {isPending && <Text style={styles.pendingTag}>(sending...)</Text>}
                    {isFailed && <Text style={styles.failedTag}>(failed to send)</Text>}
                </View>
                <Text style={[styles.text, deleted && styles.deleted]}>{message.content}</Text>
                {!!message.reactions?.length && (
                    <View style={styles.reactionsRow}>
                        {message.reactions.map(r => (
                            <View key={r.emoji} style={[styles.reactionPill, r.reacted && styles.reactionPillActive]}>
                                <Text style={styles.reactionText}>
                                    {r.emoji} {r.count}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </View>
    )
}

// memo: en una lista larga, un mensaje nuevo no debería re-renderizar los anteriores.
export default React.memo(MessageItem)

const styles = StyleSheet.create({
    system: {
        ...typography.metadata,
        color: colors.textDim,
        textAlign: 'center',
        marginVertical: spacing.sm,
    },
    row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    username: { ...typography.username },
    timestamp: { ...typography.metadata, color: '#949ba4', fontSize: 11 },
    editedTag: { ...typography.metadata, color: colors.textDim },
    pendingTag: {
        ...typography.metadata,
        color: colors.textDim,
        fontStyle: 'italic',
    },
    failedTag: {
        ...typography.metadata,
        color: colors.danger,
        fontWeight: '600',
    },
    text: { ...typography.messageText, color: colors.text },
    deleted: { color: colors.textDim, fontStyle: 'italic' },
    reactionsRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs, flexWrap: 'wrap' },
    reactionPill: {
        backgroundColor: colors.surface,
        borderRadius: radii.sm,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
    },
    reactionPillActive: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
    reactionText: { fontSize: 12, color: colors.text },
})