import React, { createContext, useContext, useMemo, useState } from 'react'
import type { AuthScreen } from '../types'

interface AuthContextValue {
  isAuthenticated: boolean
  authScreen: AuthScreen
  setAuthScreen: (screen: AuthScreen) => void
  // No-op intencional: no hay backend, solo simula el estado de sesión.
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login')

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      authScreen,
      setAuthScreen,
      login: () => setIsAuthenticated(true),
      logout: () => {
        setIsAuthenticated(false)
        setAuthScreen('login')
      },
    }),
    [isAuthenticated, authScreen],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
