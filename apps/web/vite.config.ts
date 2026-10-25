import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // dist/ en la raíz del repo: ahí lo buscan Cloudflare Pages (destination_dir) y el Dockerfile
    outDir: fileURLToPath(new URL('../../dist', import.meta.url)),
    emptyOutDir: true,
    // El único chunk que pasa los 500 kB es livekit-client, que se carga recién al entrar a un canal de voz
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        // Dependencias en chunks propios: cambian poco entre deploys y el navegador las reusa de la caché
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'scheduler'],
          motion: ['motion/react'],
          auth: ['@auth0/auth0-spa-js'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true, // Útil para Docker en macOS/Windows
    },
  },
});
