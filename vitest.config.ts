import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [path.resolve(__dirname, './src/test/setup.ts')],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'templates/**',
      'e2e/**',
      'plugins/booking/__tests__/plugin-integration.test.ts',
      'plugins/booking/__tests__/routes/**',
    ],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
