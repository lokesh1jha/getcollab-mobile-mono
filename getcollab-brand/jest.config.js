module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEach: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|socket\\.io-client|engine\\.io-client|posthog-react-native|zustand)|@react-native-async-storage/async-storage)',
  ],
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
