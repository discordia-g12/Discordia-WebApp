import React from 'react'
import { Platform, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

import { configureClient } from '@discordia/core'
import { getApiBaseUrl } from './src/utils/config'
import { sendFormWithXhr } from './src/api/upload'

configureClient({
  baseUrl: getApiBaseUrl(),
  // En iOS y Android los archivos (avatar, ícono) van por XMLHttpRequest; en la web, fetch sirve
  sendForm: Platform.OS === 'web' ? undefined : sendFormWithXhr,
})

import { AppProviders, useAuth } from './src/providers/AppProviders'
import { ThemeProvider, useAppFonts, useTheme } from './src/theme'
import MobileShell from './src/components/MobileShell'
import AuthView from './src/views/AuthView'
import { DawnIntro } from './src/views/DawnIntro'
import { Catalog, isCatalogRequested } from './src/views/Catalog'
import { CrashScreen } from './src/views/CrashScreen'
import { ErrorBoundary } from './src/ui'

function Root() {
  const { isAuthenticated } = useAuth()
  const theme = useTheme()
  if (isCatalogRequested()) return <Catalog />
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
          {/* Adentro de los providers: reintentar vuelve a montar las pantallas sin perder la sesión */}
          <ErrorBoundary fallback={(error, reset) => <CrashScreen error={error} onRetry={reset} />}>
            <Root />
          </ErrorBoundary>
        </AppProviders>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
