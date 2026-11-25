import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * The browser only ever calls `/api` on its own origin. In development Vite
 * forwards it to the API; in Docker, nginx does the same. So there is no CORS,
 * and the client never knows where the API or Fake Store live.
 */
const API_TARGET = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': API_TARGET },
  },
  preview: {
    port: 4173,
    proxy: { '/api': API_TARGET },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-support/setup.ts'],
  },
});
