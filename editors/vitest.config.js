import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: './node_modules/.vite',
  test: {
    environment: 'jsdom',
    root: './vault/01-23-2026',
    include: ['tests/**/*.test.js'],
  },
});
