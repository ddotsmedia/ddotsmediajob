import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Override any postcss config discovered in parent dirs — these are pure-TS unit tests.
  css: { postcss: { plugins: [] } },
  test: {
    css: false,
    include: ['packages/**/*.test.ts', 'apps/**/src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
  },
});
