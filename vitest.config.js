import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'workbox-window': new URL('./tools/empty-module.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    clearMocks: true,
    globals: true,
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['./tools/setup-tests.ts'],
    server: {
      deps: {
        inline: [/@openmrs/, 'workbox-window'],
      },
    },
    alias: {
      '@openmrs/esm-framework/src/internal': '@openmrs/esm-framework/mock',
      '@openmrs/esm-framework': '@openmrs/esm-framework/mock',
      'react-i18next': new URL('./__mocks__/react-i18next.js', import.meta.url).pathname,
      '@mocks/': new URL('./__mocks__/', import.meta.url).pathname,
      '@tools/': new URL('./tools/', import.meta.url).pathname,
    },
  },
});
