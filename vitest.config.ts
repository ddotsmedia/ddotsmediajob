import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Mirror apps/web's tsconfig paths so app tests can use the same '@/' imports
  // as the code they test.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)) },
  },
  // Override any postcss config discovered in parent dirs — these are pure-TS unit tests.
  css: { postcss: { plugins: [] } },
  test: {
    css: false,
    include: ['packages/**/*.test.ts', 'apps/**/src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
  },
});
