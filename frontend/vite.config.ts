/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const packagePath = id.replace(/\\/g, '/').split('/node_modules/').at(-1);
          if (!id.includes('node_modules') || !packagePath) return;
          if (/^@tanstack\/(react-query|query-core)\//.test(packagePath)) return 'query';
          if (/^(react|react-dom|react-router|react-router-dom|scheduler)\//.test(packagePath)) return 'react-vendor';
          if (/^(framer-motion|motion-dom|motion-utils)\//.test(packagePath)) return 'motion';
          return 'vendor';
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Exclude Playwright E2E specs — those run via `npm run e2e`
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
  },
})
