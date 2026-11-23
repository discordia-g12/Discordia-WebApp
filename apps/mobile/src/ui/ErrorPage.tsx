import React from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { makeStyles } from '../theme'
import { Background } from './Background'
import { DisplayText } from './DisplayText'
import { Logo } from './Logo'
import { Text } from './Text'

interface ErrorPageProps {
  /** Código chico arriba del texto ("404"). Sin código: un error de la interfaz. */
  code?: string
  /** La palabra gigante al pie ("Algo falló"). */
  title: string
  /** Qué pasó y qué hacer, en una o dos oraciones. */
  message: string
  /** Detalle técnico chico, con barra inicial (solo en desarrollo, por ejemplo). */
  detail?: string
  brand?: string
  /** Las acciones: el bloque negro y, si hace falta, una secundaria. */
  children?: React.ReactNode
}

/**
 * Página de error del rediseño, la misma composición que el acceso (views/AuthView): el resplandor de
 * fondo, el texto arriba y la palabra gigante al pie. No depende de la sesión ni de los datos, así se puede
 * mostrar cuando el resto de la app no anda. Mismo nombre y props que la de la web (apps/web/src/ui).
 */
export function ErrorPage({ code, title, message, detail, brand = 'discordia/', children }: ErrorPageProps) {
  const styles = useStyles()
  return (
    <View style={styles.screen}>
      <Background gradient="backgroundGlow" drift />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.column}>
          <View style={styles.panel} accessibilityRole="alert">
            {code ? (
              <Text variant="label" tone="muted">
                error {code}/
              </Text>
            ) : null}
            <Text variant="body">{message}</Text>
            {detail ? (
              <Text variant="bodySmall" tone="muted">
                / {detail}
              </Text>
            ) : null}
            {children ? <View style={styles.actions}>{children}</View> : null}
          </View>
          <View style={styles.heading}>
            <View style={styles.brand}>
              <Logo size={20} />
              <Text variant="label">{brand}</Text>
            </View>
            <View accessibilityRole="header">
              <DisplayText active>{title}</DisplayText>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const useStyles = makeStyles(t => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  // Sin fondo propio: el resplandor (Background) va por detrás
  flex: { flex: 1 },
  // El texto arriba y la palabra al pie, pegada al borde de abajo (como el acceso)
  column: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: t.space[7],
    paddingTop: t.space[8],
    paddingHorizontal: t.space[5],
    paddingBottom: t.space[1],
  },
  panel: { width: '100%', maxWidth: 480, gap: t.space[5] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: t.space[6], rowGap: t.space[3] },
  heading: { gap: t.space[2] },
  brand: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
}))
