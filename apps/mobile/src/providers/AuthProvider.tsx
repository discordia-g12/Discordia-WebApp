import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  backToLogin as sessionBackToLogin,
  bootstrap,
  loginWithCredentials,
  logout as sessionLogout,
  setAuthAdapter,
  setSessionProfile,
  signupWithCredentials,
  useSession,
} from '@discordia/core'
import type { AuthScreen } from '../types'
import { BackendProfile, getCurrentToken, mobileAuthAdapter } from '../api/auth'

setAuthAdapter(mobileAuthAdapter)

export interface AuthContextValue {
  isAuthenticated: boolean
  authScreen: AuthScreen
  setAuthScreen: (screen: AuthScreen) => void
  token: string | null
  userProfile: BackendProfile | null
  isLoading: boolean
  /** Email pendiente de verificación: se muestra en la pantalla 'verify-email' y precarga el login. */
  pendingVerificationEmail: string | null
  /** Desde 'verify-email' vuelve al login conservando el email pendiente. */
  backToLogin: () => void
  /** Desde 'verify-email' descarta el email pendiente para ingresar con otra cuenta. */
  switchAccount: () => void
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateUserProfile: (profile: BackendProfile) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function sanitizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_.-]/g, '_').slice(0, 32)
}

/**
 * Después de un login o registro, la sesión de core quedó en un estado: los que no son
 * "autenticado" ni "verificar email" se muestran como error en el formulario.
 */
async function throwIfNotAuthenticated(): Promise<void> {
  const { status, error } = useSession.getState()
  if (status === 'authenticated' || status === 'email_unverified') return
  if (status === 'needs_profile') {
    // Mobile no tiene pantalla para elegir otro username: se cierra la sesión y se informa
    await sessionLogout()
    throw new Error('No se pudo crear tu perfil: ese nombre de usuario ya está en uso.')
  }
  throw new Error(error?.message || 'No se pudo iniciar sesión.')
}

/**
 * Sesión de mobile: la máquina de estados es la de @discordia/core (la misma que la web); acá solo
 * queda la pantalla de auth activa, que es estado de la interfaz.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const status = useSession(s => s.status)
  const userProfile = useSession(s => s.profile)
  const pendingVerificationEmail = useSession(s => s.pendingEmail)
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    bootstrap()
  }, [])

  // Email sin verificar no es un error del formulario: es un estado con su propia pantalla.
  useEffect(() => {
    if (status === 'email_unverified') setAuthScreen('verify-email')
  }, [status])

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      await loginWithCredentials({ email: email.trim(), password })
      await throwIfNotAuthenticated()
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (username: string, email: string, password: string) => {
    setIsLoading(true)
    try {
      await signupWithCredentials({
        email: email.trim(),
        password,
        username: sanitizeUsername(username),
        displayName: username,
      })
      await throwIfNotAuthenticated()
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    sessionLogout()
    setAuthScreen('login')
  }

  const handleBackToLogin = () => {
    sessionBackToLogin()
    setAuthScreen('login')
  }

  const handleSwitchAccount = () => {
    useSession.getState().setStatus('unauthenticated', { pendingEmail: null })
    setAuthScreen('login')
  }

  const isAuthenticated = status === 'authenticated'
  const token = isAuthenticated ? getCurrentToken() : null

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      authScreen,
      setAuthScreen,
      token,
      userProfile,
      isLoading,
      pendingVerificationEmail,
      backToLogin: handleBackToLogin,
      switchAccount: handleSwitchAccount,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      updateUserProfile: setSessionProfile,
    }),
    [isAuthenticated, authScreen, token, userProfile, isLoading, pendingVerificationEmail],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
