import React from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '../../theme'

interface ConfirmModalProps {
    visible: boolean
    title: string
    message: string
    confirmLabel: string
    cancelLabel?: string
    onCancel: () => void
    onConfirm: () => void
}

// Modal para acciones "destructivas" (boton rojo)
export default function ConfirmModal({
    visible,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancelar',
    onCancel,
    onConfirm,
}: ConfirmModalProps) {
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <Pressable style={styles.overlay} onPress={onCancel}>
                <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.body}>{message}</Text>

                    <View style={styles.actions}>
                        <Pressable style={styles.cancelButton} onPress={onCancel}>
                            <Text style={styles.cancelText}>{cancelLabel}</Text>
                        </Pressable>
                        <Pressable style={styles.confirmButton} onPress={onConfirm}>
                            <Text style={styles.confirmText}>{confirmLabel}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.md,
    },
    container: {
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        padding: spacing.lg,
        width: '100%',
        maxWidth: 320,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        ...typography.pageTitle,
        fontSize: 18,
        lineHeight: 22,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    body: {
        ...typography.helperText,
        color: colors.textMuted,
        marginBottom: spacing.lg,
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: spacing.sm,
    },
    cancelButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.sm,
    },
    cancelText: {
        color: colors.text,
        fontWeight: '500',
        fontSize: 14,
    },
    confirmButton: {
        backgroundColor: colors.danger,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.sm,
    },
    confirmText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
})