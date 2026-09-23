import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './AuthProvider'
import { DataProvider } from './DataProvider'
import { UIProvider } from './UIProvider'

const queryClient = new QueryClient()

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
