import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native'

/** Navigation double with the surface the brand screens actually touch. */
export function mockNavigation() {
  return {
    navigate: jest.fn(),
    push: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    dispatch: jest.fn(),
  }
}

export type MockNavigation = ReturnType<typeof mockNavigation>

/**
 * Render a screen in isolation with a navigation double. Screens take
 * `navigation`/`route` as props from the stack, so no navigator is needed —
 * `useFocusEffect` is stubbed onto useEffect in jest.setup.js.
 */
export function renderScreen(
  Screen: React.ComponentType<any>,
  props: Record<string, unknown> = {},
) {
  const navigation = mockNavigation()
  const utils = render(
    <Screen navigation={navigation} route={{ params: {}, key: 'test', name: 'Test' }} {...props} />,
  )
  return { ...utils, navigation }
}

export { screen, waitFor, fireEvent, act }
