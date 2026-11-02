import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Backoffice de la plataforma (backoffice.discordia.lol): app aparte de la web, con su propio proyecto de
// Cloudflare Pages. Comparte con la web @discordia/core, @discordia/tokens y el catálogo de componentes.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mismo alias que en tsconfig.json
      '@web': fileURLToPath(new URL('../web/src', import.meta.url)),
    },
  },
  build: {
    // dist/ propio (el de la raíz es de la web): lo publica el proyecto discordia-backoffice de Pages
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'scheduler'],
          motion: ['motion/react'],
          auth: ['@auth0/auth0-spa-js'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    // 5173 es la web: así se pueden levantar las dos a la vez
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 5174,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [...configDefaults.exclude],
  },
});
