const expoPreset = require('jest-expo/jest-preset')

// Spread the Expo preset rather than hand-rolling the transform config: the local
// hardcoded `transformIgnorePatterns` used `node_modules/(?!…)`, which cannot see
// through pnpm's `node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>` layout — so
// React Native's own ESM `jest/setup.js` was never transformed and every suite
// died on `Cannot use import statement outside a module`. The preset ships a
// pnpm-aware pattern (it allow-lists `.pnpm`).
module.exports = {
  ...expoPreset,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    ...expoPreset.moduleNameMapper,
    '^@shared/(.*)$': '<rootDir>/../packages/mobile-shared/src/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.maestro/'],
  collectCoverageFrom: [
    'src/stores/**/*.ts',
    'src/services/**/*.ts',
    'src/components/**/*.tsx',
    'src/app/**/*.tsx',
    '!src/test-utils/**',
    '!src/**/*.d.ts',
  ],
}
