// Vitest configuration. Separate from vite.config.ts to avoid loading PWA plugin during tests.

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/vite-env.d.ts', 'src/types.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    environment: 'jsdom',
    restoreMocks: true,
    setupFiles: ['src/__tests__/setup.ts'],
  },
})
