import { Platform } from 'react-native'

// Sans-serif del sistema en cada plataforma (evita bundlear fuentes en Fase 0;
// se puede reemplazar por una fuente propia con expo-font más adelante).
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
})

export const typography = {
  pageTitle: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  sectionTitle: { fontSize: 12, fontWeight: '700' as const, lineHeight: 16, letterSpacing: 0.4 },
  channelName: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
  username: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
  messageText: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  metadata: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  helperText: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 20 },
}
