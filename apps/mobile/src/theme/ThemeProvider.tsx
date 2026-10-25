import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native'
import { nativeTheme, type ColorScheme, type NativeTheme } from '@discordia/tokens'
import { readPreference, writePreference } from '../utils/storage'

/** Tema elegido en Ajustes → Experiencia. Sin elección, sigue al sistema. */
export type ThemePreference = 'light' | 'dark' | 'system'

const PREFERENCE_KEY = 'discordia_theme'
const isPreference = (value: string | null): value is ThemePreference => value === 'light' || value === 'dark' || value === 'system'

interface ThemeContextValue {
  theme: NativeTheme
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

// Los dos temas se arman una sola vez: cambiar de tema no recalcula nada
const THEMES: Record<ColorScheme, NativeTheme> = {
  light: nativeTheme('light'),
  dark: nativeTheme('dark'),
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES.light,
  preference: 'system',
  setPreference: () => {},
})

/**
 * Tema del rediseño (docs/TODO-REDISENO.md, sección 1): los tokens de @discordia/tokens en formato
 * StyleSheet, claro u oscuro según la preferencia o el sistema.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>('system')

  // La elección guardada en el dispositivo (AsyncStorage); sin ella, el sistema
  useEffect(() => {
    readPreference(PREFERENCE_KEY).then(saved => {
      if (isPreference(saved)) setPreferenceState(saved)
    })
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    writePreference(PREFERENCE_KEY, next)
  }, [])
  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference

  const value = useMemo(
    () => ({ theme: THEMES[scheme], preference, setPreference }),
    [scheme, preference, setPreference],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): NativeTheme {
  return useContext(ThemeContext).theme
}

export function useThemePreference() {
  const { preference, setPreference } = useContext(ThemeContext)
  return { preference, setPreference }
}

/**
 * Estilos que dependen del tema: la fábrica corre una vez por tema y se guarda.
 *
 *   const useStyles = makeStyles(t => ({ root: { color: t.colors.text } }))
 *   const styles = useStyles()
 */
/** Lo que antes era `StyleSheet.NamedStyles`, que los tipos de RN 0.88 ya no exportan. */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle }

export function makeStyles<T extends NamedStyles<T>>(factory: (theme: NativeTheme) => T) {
  const cache = new Map<ColorScheme, T>()
  return function useStyles(): T {
    const theme = useTheme()
    let styles = cache.get(theme.scheme)
    if (!styles) {
      styles = StyleSheet.create(factory(theme))
      cache.set(theme.scheme, styles)
    }
    return styles
  }
}
