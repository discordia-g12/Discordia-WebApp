import React from 'react'
import { AppProviders, useAuth } from './src/providers/AppProviders'
import MobileShell from './src/components/MobileShell'
import AuthView from './src/views/AuthView'

function Root() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <MobileShell /> : <AuthView />
}

export default function App() {
  return (
    <AppProviders>
      <Root />
    </AppProviders>
  )
}
