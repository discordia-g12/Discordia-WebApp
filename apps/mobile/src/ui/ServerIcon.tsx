import React, { useState } from 'react'
import { Image, View } from 'react-native'
import { layout } from '@discordia/tokens'
import { makeStyles, useTheme } from '../theme'
import { Text } from './Text'
import { initials } from './SquareAvatar'

interface ServerIconProps {
  server: { name: string; iconUrl?: string | null }
  /** sm 24 px, md 40 px, lg 80 px (o un número en px). */
  size?: keyof typeof layout.avatarSize | number
  /**
   * Nombre accesible, solo donde el ícono es el contenido (la vista previa de Ajustes). Sin él es
   * decorativo: el nombre ya está al lado o en la etiqueta del control.
   */
  label?: string
}

/**
 * Ícono del servidor: identifica al servidor en todo lugar donde se lo nombra (la franja, el encabezado,
 * los servidores en común). Siempre cuadrado. Sin ícono (o si no carga), las iniciales sobre un bloque
 * invertido, como el avatar.
 */
export function ServerIcon({ server, size = 'sm', label }: ServerIconProps) {
  const styles = useStyles()
  const theme = useTheme()
  const [broken, setBroken] = useState(false)
  const px = typeof size === 'number' ? size : layout.avatarSize[size]
  const a11y = label
    ? ({ accessible: true, accessibilityRole: 'image', accessibilityLabel: label } as const)
    : ({ accessible: false, importantForAccessibility: 'no-hide-descendants' } as const)

  return (
    <View style={{ width: px, height: px }} {...a11y}>
      {server.iconUrl && !broken ? (
        <Image source={{ uri: server.iconUrl }} style={styles.image} onError={() => setBroken(true)} />
      ) : (
        <View style={styles.initials}>
          <Text tone="inverse" style={{ fontFamily: theme.fonts[700], fontSize: Math.max(9, px * 0.36), lineHeight: Math.max(11, px * 0.44) }}>
            {initials(server.name)}
          </Text>
        </View>
      )}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  image: { width: '100%', height: '100%', borderRadius: t.radius },
  initials: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.inverseBackground },
}))
