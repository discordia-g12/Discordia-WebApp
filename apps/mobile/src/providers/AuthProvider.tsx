import React, { createContext, useContext, useEffect, useMemo } from 'react'
import {
  bootstrap,
  logout as sessionLogout,
  setAuthAdapter,
  setAuthAdapterResolver,
  setSessionProfile,
  useSession,
} from '@discordia/core'
import { BackendProfile, getCurrentToken, mobileAuthAdapter } from '../api/auth'

setAuthAdapter(mobileAuthAdapter)

// Sin backend, como VITE_USE_MOCK en la web. Con __DEV__ en false esta rama no entra al bundle
if (__DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === 'true') {
  setAuthAdapterResolver(async () => {
    const { installMockSession } = await import('../dev/mockSession')
    useSession.getState().setStatus(useSession.getState().status, { isMock: true })
    return installMockSession()
  })
}

export interface AuthContextValue {
  isAuthenticated: boolean
  token: string | null
  userProfile: BackendProfile | null
  logout: () => void
  updateUserProfile: (profile: BackendProfile) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Sesión de mobile: la máquina de estados es la de @discordia/core (la misma que la web). Los formularios
 * de acceso usan useAuthForms de core (views/AuthView); acá queda lo que usa el resto de la app.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const status = useSession(s => s.status)
  const userProfile = useSession(s => s.profile)

  useEffect(() => {
    bootstrap()
  }, [])

  const isAuthenticated = status === 'authenticated'
  const token = isAuthenticated ? getCurrentToken() : null

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      token,
      userProfile,
      logout: () => {
        sessionLogout()
      },
      updateUserProfile: setSessionProfile,
    }),
    [isAuthenticated, token, userProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
