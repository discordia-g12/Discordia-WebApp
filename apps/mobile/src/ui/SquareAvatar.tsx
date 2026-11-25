import React, { useState } from 'react'
import { Image, View } from 'react-native'
import { layout } from '@discordia/tokens'
import type { Status } from '@discordia/core'
import { makeStyles, useTheme } from '../theme'
import { Text } from './Text'
import { remoteImage } from '../utils/remoteImage'

interface SquareAvatarProps {
  user: { displayName?: string; name?: string; username: string; avatar?: string | null }
  /** sm 24 px, md 40 px, lg 80 px (o un número en px). */
  size?: keyof typeof layout.avatarSize | number
  /** Muestra la presencia como un cuadrado chico en la esquina. */
  status?: Status
}

export const STATUS_LABEL: Record<Status, string> = {
  online: 'Conectado',
  idle: 'Ausente',
  dnd: 'No molestar',
  offline: 'Desconectado',
  invisible: 'Invisible',
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase()
}

/** Avatar cuadrado: la foto, o las iniciales sobre un bloque invertido si no hay foto (o no carga). */
export function SquareAvatar({ user, size = 'md', status }: SquareAvatarProps) {
  const styles = useStyles()
  const theme = useTheme()
  const [broken, setBroken] = useState(false)
  const px = typeof size === 'number' ? size : layout.avatarSize[size]
  const name = user.displayName || user.name || user.username
  const dot = Math.max(6, Math.round(px * 0.3))

  return (
    <View style={{ width: px, height: px }} accessible accessibilityRole="image" accessibilityLabel={status ? `${name}, ${STATUS_LABEL[status]}` : name}>
      {user.avatar && !broken ? (
        <Image source={remoteImage(user.avatar)} style={styles.image} onError={() => setBroken(true)} />
      ) : (
        <View style={styles.initials}>
          <Text tone="inverse" style={{ fontFamily: theme.fonts[700], fontSize: Math.max(10, px * 0.36), lineHeight: Math.max(12, px * 0.44) }}>
            {initials(name)}
          </Text>
        </View>
      )}
      {status && <View style={[styles.status, styles[status], { width: dot, height: dot }]} />}
    </View>
  )
}

const useStyles = makeStyles(t => ({
  image: { width: '100%', height: '100%', borderRadius: t.radius },
  initials: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.inverseBackground },
  // Presencia: cuadrado en la esquina, con borde del color del fondo para separarlo de la foto
  status: { position: 'absolute', right: -2, bottom: -2, borderWidth: t.lines.hairline, borderColor: t.colors.background },
  online: { backgroundColor: t.colors.text },
  idle: { backgroundColor: t.colors.textMuted },
  dnd: { backgroundColor: t.colors.textMuted },
  offline: { backgroundColor: t.colors.background, borderColor: t.colors.textMuted },
  invisible: { backgroundColor: t.colors.background, borderColor: t.colors.textMuted },
}))
