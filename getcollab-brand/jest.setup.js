// Silence noisy logs in tests
jest.mock('expo-secure-store', () => {
  const store = new Map()
  return {
    getItemAsync: jest.fn((key) => Promise.resolve(store.get(key) || null)),
    setItemAsync: jest.fn((key, value) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    deleteItemAsync: jest.fn((key) => {
      store.delete(key)
      return Promise.resolve()
    }),
  }
})

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve()),
}))

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
  })),
}))

// ── Screen-test prerequisites ────────────────────────────────────────────────
// Screens render `Animated.View` with layout animations, `SafeAreaView`, and
// native-backed gesture/async primitives. Each of these packages ships a jest
// mock; without them a render throws inside a worklet / native module lookup.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))
// The safe-area mock package is an ES module whose single export is the mock
// object; forwarding the namespace verbatim leaves `SafeAreaView` undefined.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

// RNTL matchers (`toBeOnTheScreen`, `toHaveTextContent`, …).
require('@testing-library/react-native/extend-expect')

// The real package resolves its font asynchronously and setState()s when it
// lands, which React reports as an unwrapped act() update in every render.
// Icon glyphs carry no meaning in these assertions, so render an inert Text.
jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  const { Text } = require('react-native')
  const Icon = (props) => React.createElement(Text, props, null)
  return { Ionicons: Icon, default: Icon }
})

// `useFocusEffect` resolves a navigation object from context, which screen tests
// render without. Run the (caller-memoized) callback on mount instead.
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native')
  const React = require('react')
  return {
    ...actual,
    useFocusEffect: (cb) => React.useEffect(cb, [cb]),
  }
})
