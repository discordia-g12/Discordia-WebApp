import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { configureClient } from '@discordia/core';

// La URL de los WebSockets se deriva de la de la API (http -> ws), así pasan por Kong. No hay una
// variable aparte para el WebSocket.
configureClient({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

import { registerQueryCacheCleaner } from './platform/auth/session';
import { useUIStore } from './app/uiStore';
import { isKnownPath } from './app/routes';
import { CrashScreen, NotFoundScreen } from './app/ErrorScreens';
import { ErrorBoundary } from './ui';
import './platform/voice';
import './index.css';

// Sistema de diseño (docs/TODO-REDISENO.md): tokens, fuente, base y el tema elegido
import '@discordia/tokens/tokens.css';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/700.css';
import '@fontsource/schibsted-grotesk/900.css';
import './ui/base.css';
import { initTheme } from './ui/theme';
import { initPreferences } from './app/preferences';
import { registerServiceWorker } from './platform/push';

initTheme();
// Tamaño de letra del chat (Ajustes → Experiencia), guardado en este navegador
initPreferences();
// Solo deja listo el service worker de push (public/sw.js): el permiso se pide desde Ajustes
registerServiceWorker();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // No reintentar ante 401 (lo resuelve el interceptor) ni ante 403 o 404
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403 || status === 404) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

// Al cerrar sesión: borrar el caché y lo que se estaba mirando, así la próxima cuenta en esta pestaña
// arranca en el inicio y no en un servidor de la anterior
registerQueryCacheCleaner(() => {
  queryClient.clear();
  useUIStore.setState({ selectedServerId: 'home', selectedChannelId: null, selectedDm: null, appView: 'home' });
});

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Catálogo de componentes del rediseño, solo en desarrollo: /?catalogo (con import() dinámico, no
// llega al build de producción)
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('catalogo')) {
  import('./ui/Catalog').then(({ Catalog }) => root.render(<Catalog />));
} else if (!isKnownPath(window.location.pathname)) {
  // Link roto: ni siquiera arranca la sesión
  root.render(<NotFoundScreen />);
} else {
  // Un error al dibujar en cualquier parte muestra "Algo falló" con recargar, en vez de la pantalla en blanco
  root.render(
    <React.StrictMode>
      <ErrorBoundary fallback={(error) => <CrashScreen error={error} />}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
