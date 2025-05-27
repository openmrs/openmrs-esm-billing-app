/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * @returns {Promise<import('jest').Config>}
 */
const path = require('path');

module.exports = {
  clearMocks: true,
  collectCoverageFrom: [
    '**/src/**/*.component.tsx',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/src/**/*.test.*',
    '!**/src/declarations.d.ts',
    '!**/e2e/**',
  ],
  transform: {
    '^.+\\.[jt]sx?$': ['@swc/jest'],
  },
  transformIgnorePatterns: ['/node_modules/(?!@openmrs|.+\\.pnp\\.[^\\/]+$)'],
  moduleNameMapper: {
    '\\.(s?css)$': 'identity-obj-proxy',
    '@openmrs/esm-framework': '@openmrs/esm-framework/mock',
    '^dexie$': require.resolve('dexie'),
    '^lodash-es/(.*)$': 'lodash/$1',
    '^lodash-es$': 'lodash',
    '^react-i18next$': path.resolve(__dirname, '__mocks__', 'react-i18next.js'),
    '^uuid$': path.resolve(__dirname, 'node_modules', 'uuid', 'dist', 'index.js'),
  },
  setupFilesAfterEnv: [path.resolve(__dirname, 'tools', 'setup-tests.ts')],
  testPathIgnorePatterns: [path.resolve(__dirname, 'e2e')],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
  testTimeout: 20000,
};
