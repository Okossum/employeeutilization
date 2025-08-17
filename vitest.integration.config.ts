/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/integration-setup.ts'],
    include: ['src/**/*.integration.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    testTimeout: 60000, // Longer timeout for emulator tests
    hookTimeout: 30000,
    teardownTimeout: 30000
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
