import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radii } from '../../theme'

interface AvatarProps {
    label: string
    color: string
    size?: number
    fontSize?: number
    statusColor?: string
    statusRingColor?: string
}

export default function Avatar({
    label,
    color,
    size = 36,
    fontSize,
    statusColor,
    statusRingColor = colors.elevated,
}: AvatarProps) {
    const circle = (
        <View
            style={[
                styles.circle,
                { width: size, height: size, backgroundColor: color },
            ]}
        >
            <Text style={[styles.initial, fontSize !== undefined && { fontSize }]}>
                {label.charAt(0)}
            </Text>
        </View>
    )

    if (!statusColor) return circle

    return (
        <View style={styles.wrap}>
            {circle}
            <View
                style={[
                    styles.statusDot,
                    { backgroundColor: statusColor, borderColor: statusRingColor },
                ]}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    wrap: { position: 'relative' },
    circle: {
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initial: { color: '#fff', fontWeight: '700' },
    statusDot: {
        position: 'absolute',
        right: -1,
        bottom: -1,
        width: 12,
        height: 12,
        borderRadius: radii.full,
        borderWidth: 2,
    },
})