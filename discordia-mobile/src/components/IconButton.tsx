import React from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { colors, radii } from '../theme'

interface IconButtonProps {
    onPress?: () => void
    children: React.ReactNode
}

// Acciones con Icono
export default function IconButton({ onPress, children }: IconButtonProps) {
    return (
        <Pressable style={styles.button} onPress={onPress}>
            {children}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: {
        width: 36,
        height: 36,
        borderRadius: radii.sm,
        backgroundColor: colors.elevated,
        alignItems: 'center',
        justifyContent: 'center',
    },
})