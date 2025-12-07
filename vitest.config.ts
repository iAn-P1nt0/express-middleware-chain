import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      lines: 0.85,
      functions: 0.85,
      branches: 0.85,
      statements: 0.85
    }
  }
});
