/**
 * Configuración del backoffice (variables de Vite, ver .env.example). Son valores públicos: van en el
 * bundle. En producción las define el proyecto discordia-backoffice de Cloudflare Pages
 * (infra/terraform/pages.tf del orquestador).
 */

const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  auth0: {
    // El mismo tenant y la misma API que la web: el access token trae el claim de rol que valida Kong
    domain: import.meta.env.VITE_AUTH0_DOMAIN || 'dev-dppme5iaqg60gkmo.us.auth0.com',
    audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'https://api.discordia.com',
    // Sin valor por defecto: es la aplicación "Discordia Backoffice" de Auth0, no la de la web
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || '',
  },
  grafanaUrl: withoutTrailingSlash(import.meta.env.VITE_GRAFANA_URL || 'http://localhost:3030'),
  appUrl: withoutTrailingSlash(import.meta.env.VITE_APP_URL || 'http://localhost:5173'),
  /** Entrar como staff sin Auth0 ni backend. Nunca en el build de producción. */
  useMock: import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true',
};
