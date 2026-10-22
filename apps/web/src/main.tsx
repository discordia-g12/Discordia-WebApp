import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { configureClient } from '@discordia/core';

// La URL de los WebSockets se deriva de la de la API (http -> ws), así pasan por Kong. VITE_WS_URL no
// se usa: en el compose del orquestador apunta directo al Chat-Engine.
configureClient({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

import { registerQueryCacheCleaner } from './auth/session';
import './platform/voice';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // No reintentar ante 401 (lo resuelve el interceptor) ni ante 403 o 404
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

// Registrar limpiador de caché para logout
registerQueryCacheCleaner(() => queryClient.clear());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
