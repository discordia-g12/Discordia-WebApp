import React from 'react'
import Svg, { Polygon } from 'react-native-svg'
import { useTheme } from '../theme'

interface LogoProps {
  /** Alto en px. */
  size?: number
  /** Por defecto, el color del texto (se invierte solo en el modo oscuro). */
  color?: string
}

/** La "D" geométrica de Discordia (el mismo trazo que apps/web/src/assets/logo.svg). */
export function Logo({ size = 24, color }: LogoProps) {
  const { colors } = useTheme()
  return (
    <Svg
      viewBox="22.47 13.38 22.47 21.23"
      height={size}
      width={(size * 22.47) / 21.23}
      accessibilityRole="image"
      accessibilityLabel="Discordia"
    >
      <Polygon
        fill={color ?? colors.text}
        points="40.81 13.4 44.94 18.88 44.91 28.88 40.81 34.61 22.47 34.61 22.47 24.96 42.85 24.96 42.85 23.58 22.47 23.58 22.47 13.38"
      />
    </Svg>
  )
}
