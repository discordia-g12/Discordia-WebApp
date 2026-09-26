import React, { createContext, useContext, useMemo, useState } from 'react'
import type { AuthScreen } from '../types'
import {
  BackendProfile,
  loginWithCredentials,
  signupWithCredentials,
  setAuthToken,
} from '../api/auth'

import { EmailNotVerifiedError } from '../api/authErrors'

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
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login')
  const [token, setToken] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<BackendProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)

  // Email sin verificar no es un error del formulario: es un estado con su propia
  // pantalla. Cualquier otro error sigue subiendo para que AuthView lo muestre.
  const showVerificationIfNeeded = (err: unknown, email: string): boolean => {
    if (!(err instanceof EmailNotVerifiedError)) return false
    setAuthToken(null)
    setPendingVerificationEmail(err.email || email.trim())
    setAuthScreen('verify-email')
    return true
  }

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const session = await loginWithCredentials(email, password)
      setToken(session.token)
      setUserProfile(session.profile)
      setPendingVerificationEmail(null)
      setIsAuthenticated(true)
    } catch (err) {
      if (!showVerificationIfNeeded(err, email)) throw err
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (username: string, email: string, password: string) => {
    setIsLoading(true)
    try {
      const session = await signupWithCredentials(username, email, password)
      setToken(session.token)
      setUserProfile(session.profile)
      setPendingVerificationEmail(null)
      setIsAuthenticated(true)
    } catch (err) {
      // Registro exitoso con verificación pendiente: la cuenta ya existe en Auth0.
      if (!showVerificationIfNeeded(err, email)) throw err
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setAuthToken(null)
    setToken(null)
    setUserProfile(null)
    setIsAuthenticated(false)
    setPendingVerificationEmail(null)
    setAuthScreen('login')
  }

  const handleBackToLogin = () => setAuthScreen('login')

  const handleSwitchAccount = () => {
    setPendingVerificationEmail(null)
    setAuthScreen('login')
  }

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
