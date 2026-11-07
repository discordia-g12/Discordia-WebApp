import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureClient } from '@discordia/core';
import { config } from './config';
import { getAccessToken, handleAccountSuspended, handleAuthFailure } from './auth/session';
import App from './App';

// Sistema de diseño: los mismos tokens, fuente y base que la web
import '@discordia/tokens/tokens.css';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/700.css';
import '@fontsource/schibsted-grotesk/900.css';
import '@web/ui/base.css';
import './index.css';
import { initTheme } from '@web/ui/theme';

// Las llamadas a la API pasan por Kong con el token del staff; un 401 sin renovar vuelve a "entrar"
configureClient({
  baseUrl: config.apiUrl,
  getToken: getAccessToken,
  onAuthFailure: handleAuthFailure,
  // Si suspenden la cuenta del staff, no la sesión de la web (auth/session.ts de core)
  onAccountSuspended: handleAccountSuspended,
});

initTheme();

// Para los hooks de React Query de cada etapa: sin reintentos ante 401, 403 o 404
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
