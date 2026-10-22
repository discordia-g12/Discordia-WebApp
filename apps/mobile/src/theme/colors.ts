// Portado 1:1 desde src/index.css del proyecto web original.
export const colors = {
  rail: '#0a0a12',
  sidebar: '#111119',
  bg: '#16161f',
  surface: '#1e1e2e',
  surfaceHover: '#25253a',
  elevated: '#2a2a45',
  floating: '#32325a',

  accent: '#7c5cfc',
  accentHover: '#6a48f0',
  accentMuted: 'rgba(124, 92, 252, 0.15)',
  accentFg: '#ffffff',

  text: '#e6e6f5',
  textMuted: '#8888aa',
  textDim: '#4a4a68',

  online: '#3db57a',
  idle: '#faa61a',
  dnd: '#ed4245',
  offline: '#60607a',

  success: '#3db57a',
  warning: '#f5a623',
  danger: '#ed4245',
  dangerHover: '#c23535',
  info: '#5865f2',

  border: 'rgba(255, 255, 255, 0.06)',
  borderStrong: 'rgba(255, 255, 255, 0.12)',

  boost: '#ff73fa',
  gold: '#f5a623',
} as const

export type ColorToken = keyof typeof colors

// Estado de presencia -> color, usado en Avatar/StatusIndicator/MemberList/etc.
export const statusColor: Record<
  'online' | 'idle' | 'dnd' | 'offline' | 'invisible',
  string
> = {
  online: colors.online,
  idle: colors.idle,
  dnd: colors.dnd,
  offline: colors.offline,
  invisible: colors.offline,
}
