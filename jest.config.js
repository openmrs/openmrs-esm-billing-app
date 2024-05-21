/**
 * @returns {Promise<import('jest').Config>}
 */
const path = require('path');

module.exports = {
  collectCoverageFrom: [
    '**/src/**/*.component.tsx',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/src/**/*.test.*',
    '!**/src/declarations.d.ts',
    '!**/e2e/**',
  ],
  transform: {
    '^.+\\.(j|t)sx?$': '@swc/jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!@openmrs)'],
  moduleNameMapper: {
    '\\.(s?css)$': 'identity-obj-proxy',
    '@openmrs/esm-framework': '@openmrs/esm-framework/mock',
    '^dexie$': require.resolve('dexie'),
    '^lodash-es/(.*)$': 'lodash/$1',
    '^lodash-es$': 'lodash',
    '^react-i18next$': path.resolve(__dirname, '__mocks__', 'react-i18next.js'),
    '^uuid$': path.resolve(__dirname, 'node_modules', 'uuid', 'dist', 'index.js'),
  },
  setupFilesAfterEnv: ['<rootDir>/src/setup-tests.ts'],
  testPathIgnorePatterns: [path.resolve(__dirname, 'e2e')],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
  testTimeout: 20000,
};
