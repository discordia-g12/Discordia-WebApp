import React from 'react'
import { View } from 'react-native'
import { makeStyles } from '../../theme'
import { ActionLink, Skeleton, Text } from '../../ui'

/** Lo que va en lugar de una lista que carga o que falló. */
export function ListStatus({ loading, label, onRetry }: { loading: boolean; label: string; onRetry: () => void }) {
  const styles = useStyles()
  return (
    <View style={styles.root}>
      {loading ? (
        <Skeleton lines={5} label={`Cargando ${label}`} />
      ) : (
        <>
          <Text variant="bodySmall">No se pudo cargar: {label}.</Text>
          <ActionLink onPress={onRetry}>reintentar</ActionLink>
        </>
      )}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  root: { gap: t.space[2], paddingVertical: t.space[5], paddingHorizontal: t.space[4] },
}))
