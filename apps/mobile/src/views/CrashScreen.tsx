import React from 'react'
import { useAuth } from '../providers/AppProviders'
import { ActionLink, BlockButton, ErrorPage } from '../ui'

/**
 * La interfaz falló al dibujarse (ErrorBoundary de App.tsx). Reintentar vuelve a montar las pantallas con la
 * misma sesión. Si se repite (por ejemplo, un dato de esa cuenta que la rompe), salir es la salida. El
 * detalle técnico, solo en desarrollo.
 */
export function CrashScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { isAuthenticated, logout } = useAuth()

  return (
    <ErrorPage
      title="Algo falló"
      message="Se rompió algo en la pantalla y no pudimos seguir mostrándola. Reintentá para volver; si se repite, avisanos."
      detail={__DEV__ ? error.message : undefined}
    >
      <BlockButton size="large" onPress={onRetry}>
        Reintentar
      </BlockButton>
      {isAuthenticated ? (
        <ActionLink
          size="bodySmall"
          onPress={() => {
            logout()
            onRetry()
          }}
        >
          salir
        </ActionLink>
      ) : null}
    </ErrorPage>
  )
}
