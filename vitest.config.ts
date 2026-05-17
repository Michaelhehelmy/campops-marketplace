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
      '**/.next/**',
      'templates/**',
      'e2e/**',
      'plugins/booking/__tests__/plugin-integration.test.ts',
      'plugins/booking/__tests__/routes/**',
    ],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**/*.{ts,tsx}', 'src/app/api/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/__tests__/**',
        '**/dist/**',
        '**/.next/**',
        'src/test/**',
        'src/lib/auth-client.ts',
        'src/lib/plugins-frontend-init.ts',
        '**/*.config.*',
        '**/next-env.d.ts',
      ],
      thresholds: {
        statements: 60,
        lines: 60,
        functions: 65,
        branches: 50,
      },
    },
  },
});
