import React from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useUI } from '../providers/AppProviders'
import { colors, radii, spacing, typography } from '../theme'

// Notificacion efimera
export default function Toast() {
    const { toast, dismissToast } = useUI()
    if (!toast) return null

    return (
        <Pressable
            onPress={dismissToast}
            style={[
                styles.container,
                toast.type === 'error' && styles.error,
                toast.type === 'success' && styles.success,
            ]}
        >
            <Text style={styles.text}>{toast.message}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        left: spacing.md,
        right: spacing.md,
        backgroundColor: colors.elevated,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        borderLeftWidth: 4,
        borderLeftColor: colors.accent,
        zIndex: 999,
    },
    error: {
        borderLeftColor: colors.danger,
    },
    success: {
        borderLeftColor: colors.success,
    },
    text: {
        ...typography.helperText,
        color: colors.text,
        fontWeight: '500',
    },
})