/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    types: ['vitest/globals'],
    // supabase/functions runs on Deno (import specifiers like
    // 'https://deno.land/...' aren't resolvable by Node/Vite) and has its
    // own test files run via `deno test`, not vitest.
    exclude: ['**/node_modules/**', 'supabase/functions/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})