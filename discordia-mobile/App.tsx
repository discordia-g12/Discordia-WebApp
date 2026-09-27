import React from 'react'

import { configureClient } from '@shared/api/client'
import { getApiBaseUrl } from './src/utils/config'

configureClient({
  baseUrl: getApiBaseUrl()
})

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
