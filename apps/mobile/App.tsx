import React from 'react'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

import { configureClient } from '@discordia/core'
import { getApiBaseUrl } from './src/utils/config'

configureClient({
  baseUrl: getApiBaseUrl()
})

import { AppProviders, useAuth } from './src/providers/AppProviders'
import { ThemeProvider, useAppFonts, useTheme } from './src/theme'
import MobileShell from './src/components/MobileShell'
import AuthView from './src/views/AuthView'
import { DawnIntro } from './src/views/DawnIntro'

function Root() {
  const { isAuthenticated } = useAuth()
  const theme = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Íconos de la barra de estado oscuros sobre el cielo, claros de noche */}
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      {isAuthenticated ? <MobileShell /> : <AuthView />}
      {/* Encima de todo mientras la sesión arranca (solo la primera vez) */}
      <DawnIntro />
    </View>
  )
}

export default function App() {
  // Sin la fuente no se dibuja nada: la pantalla de carga nativa sigue hasta que está lista
  const fontsReady = useAppFonts()
  if (!fontsReady) return null

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProviders>
          <Root />
        </AppProviders>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
