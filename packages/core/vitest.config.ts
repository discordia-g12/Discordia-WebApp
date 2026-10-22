import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom: los tests del cliente HTTP verifican que no se use localStorage / sessionStorage
    environment: 'jsdom',
    globals: true,
  },
});
