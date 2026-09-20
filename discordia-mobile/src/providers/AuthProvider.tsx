import React, { createContext, useContext, useMemo, useState } from 'react'
import type { AuthScreen } from '../types'
import {
  BackendProfile,
  loginWithCredentials,
  signupWithCredentials,
} from '../api/auth'
import { setAuthToken } from '../api/client'

export interface AuthContextValue {
  isAuthenticated: boolean
  authScreen: AuthScreen
  setAuthScreen: (screen: AuthScreen) => void
  token: string | null
  userProfile: BackendProfile | null
  isLoading: boolean
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

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const session = await loginWithCredentials(email, password)
      setToken(session.token)
      setUserProfile(session.profile)
      setIsAuthenticated(true)
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
      setIsAuthenticated(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    setAuthToken(null)
    setToken(null)
    setUserProfile(null)
    setIsAuthenticated(false)
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
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
    }),
    [isAuthenticated, authScreen, token, userProfile, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
