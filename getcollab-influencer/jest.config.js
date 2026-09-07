const expoPreset = require('jest-expo/jest-preset')

module.exports = {
  ...expoPreset,
  // The installed React Native 0.81 preset injects an ESM setup file that
  // Jest 29 loads before Babel. These tests are store/API tests and use the
  // Node environment, so keep the Expo transform but skip that incompatible
  // native setup hook.
  setupFiles: [],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: expoPreset.transformIgnorePatterns,
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../packages/mobile-shared/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.maestro/'],
  collectCoverageFrom: [
    'src/stores/**/*.ts',
    'src/services/**/*.ts',
    'src/components/**/*.tsx',
    '!src/**/*.d.ts',
  ],
  testEnvironment: 'node',
}
