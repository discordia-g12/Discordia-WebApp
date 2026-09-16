import React from 'react'
import { AuthProvider } from './AuthProvider'
import { DataProvider } from './DataProvider'
import { UIProvider } from './UIProvider'

// Orden: Auth por fuera (todo depende de si hay sesión), Data en el medio
// (el "server" mock), UI por dentro (depende de qué datos hay seleccionados).
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        <UIProvider>{children}</UIProvider>
      </DataProvider>
    </AuthProvider>
  )
}

export { useAuth } from './AuthProvider'
export { useData } from './DataProvider'
export { useUI } from './UIProvider'
