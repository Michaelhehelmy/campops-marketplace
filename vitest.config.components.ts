import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    name: 'components',
    environment: 'jsdom',
    globals: true,
    include: ['src/components/homepage/__tests__/**', 'plugins/**/__tests__/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**', 'templates/**', '**/e2e/**', '**/setup.js'],
    setupFiles: ['./src/components/homepage/__tests__/setup.js'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
