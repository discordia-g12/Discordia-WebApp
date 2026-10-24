import React from 'react'
import { View } from 'react-native'
import { makeStyles } from '../theme'
import { Text } from './Text'

interface EmptyStateProps {
  /** "por ahora todo está tranquilo" */
  title: string
  /** "cuando un amigo empiece una actividad aparecerá aquí": se muestra con barra inicial. */
  hint?: string
}

/** Estado vacío: título en negrita y una bajada chica con barra inicial (PDF, pág. 6). */
export function EmptyState({ title, hint }: EmptyStateProps) {
  const styles = useStyles()
  return (
    <View style={styles.root}>
      <Text variant="heading">{title}</Text>
      {hint && (
        <Text variant="meta" tone="muted">
          / {hint}
        </Text>
      )}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  root: { gap: t.space[2], maxWidth: 280 },
}))
