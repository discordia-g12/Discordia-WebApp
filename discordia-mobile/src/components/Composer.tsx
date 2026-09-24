import React from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { Paperclip, Send } from 'lucide-react-native'
import { colors, radii, spacing } from '../theme'

interface ComposerProps {
    channelName: string
    value: string
    onChangeText: (text: string) => void
    onSend: () => void
}

// Donde se escriben mensajes, adjuntan archiuvos y se envian
export default function Composer({ channelName, value, onChangeText, onSend }: ComposerProps) {
    const canSend = !!value.trim()

    return (
        <View style={styles.composer}>
            <Pressable style={styles.iconButton} hitSlop={8}>
                <Paperclip color={colors.textMuted} size={20} />
            </Pressable>
            <TextInput
                style={styles.input}
                placeholder={`Enviar mensaje en #${channelName}`}
                placeholderTextColor={colors.textDim}
                value={value}
                onChangeText={onChangeText}
                maxLength={2500}
                multiline
            />
            <Pressable
                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                onPress={onSend}
                disabled={!canSend}
                hitSlop={8}
            >
                <Send color={canSend ? colors.accentFg : colors.textDim} size={18} />
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    composer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    input: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        maxHeight: 100,
    },
    iconButton: {
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.full,
    },
    sendButton: {
        width: 38,
        height: 38,
        borderRadius: radii.full,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: colors.surface,
    },
})