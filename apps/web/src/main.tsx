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

import { registerQueryCacheCleaner } from './platform/auth/session';
import './platform/voice';
import './index.css';

// Rediseño (paso 3 de docs/TODO-REDISENO.md): tokens, fuente y base. Todo queda detrás del flag
// data-ui="nuevo" (ui/flag.ts); sin el flag la app se ve como siempre.
import '@discordia/tokens/tokens.css';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/700.css';
import '@fontsource/schibsted-grotesk/900.css';
import './ui/base.css';
import { initUiFlag } from './ui/flag';

initUiFlag();

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

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Catálogo de componentes del rediseño, solo en desarrollo: /?catalogo (con import() dinámico, no
// llega al build de producción)
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('catalogo')) {
  import('./ui/Catalog').then(({ Catalog }) => root.render(<Catalog />));
} else {
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
