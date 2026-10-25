import { defineConfig } from 'vitest/config';

export default defineConfig({
  // JSX de los tests de hooks (wrappers con QueryClientProvider) sin importar React
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    // jsdom: los tests del cliente HTTP verifican que no se use localStorage / sessionStorage
    environment: 'jsdom',
    globals: true,
  },
});
