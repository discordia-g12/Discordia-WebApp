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
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true, // Útil para Docker en macOS/Windows
    },
  },
});
