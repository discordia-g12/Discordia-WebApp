import React from 'react'
import { AppState } from 'react-native'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { registerQueryCacheCleaner } from '@discordia/core'
import { AuthProvider } from './AuthProvider'
import { DataProvider } from './DataProvider'
import { UIProvider } from './UIProvider'

const queryClient = new QueryClient()

// Al cerrar sesión (o perderla por un 401) no quedan datos del usuario anterior en caché
registerQueryCacheCleaner(() => queryClient.clear())

// React Query no sabe solo cuándo la app vuelve al frente (en la web usa la visibilidad de la pestaña):
// con esto, refetchOnWindowFocus funciona y los pedidos periódicos se pausan en segundo plano
focusManager.setEventListener(handleFocus => {
  const subscription = AppState.addEventListener('change', state => handleFocus(state === 'active'))
  return () => subscription.remove()
})

// Orden: Auth por fuera (todo depende de si hay sesión), QueryClient justo
// adentro (features nuevas como roles usan react-query en vez del
// DataProvider), Data en el medio (el "server" mock), UI por dentro
// (depende de qué datos hay seleccionados).
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <DataProvider>
          <UIProvider>{children}</UIProvider>
        </DataProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export { useAuth } from './AuthProvider'
export { useData } from './DataProvider'
export { useUI } from './UIProvider'
