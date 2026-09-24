import React from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { Search, UserPlus } from 'lucide-react-native'
import { colors, radii, spacing } from '../theme'
import IconButton from './IconButton'

// La parte donde se busca o invita a un server
export default function SidebarSearchRow() {
    return (
        <View style={styles.row}>
            <View style={styles.searchBox}>
                <Search color={colors.textMuted} size={15} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar"
                    placeholderTextColor={colors.textMuted}
                    editable={false}
                />
            </View>
            <IconButton>
                <UserPlus color={colors.text} size={18} />
            </IconButton>
        </View>
    )
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.bg,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.sm,
        height: 36,
    },
    searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
})