import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: './node_modules/.vite',
  test: {
    environment: 'jsdom',
    include: [
      'vault/01-23-2026/tests/**/*.test.js',
      'drifts/**/*.test.js',
    ],
  },
});
