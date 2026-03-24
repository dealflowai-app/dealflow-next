import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
      thresholds: {
        statements: 3,
        branches: 3,
        functions: 5,
        lines: 3,
      },
    },
  },
})
