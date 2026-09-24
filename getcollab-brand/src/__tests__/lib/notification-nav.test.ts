import { collectRouteNames, navigateToNotification } from '@shared/services/notification-service'

// jest.mock is hoisted above module-level consts, so the ref lives in the factory.
jest.mock('@react-navigation/native', () => {
  const ref = { isReady: jest.fn(() => true), navigate: jest.fn(), getRootState: jest.fn() }
  return {
    ...jest.requireActual('@react-navigation/native'),
    __ref: ref,
    createNavigationContainerRef: () => ref,
  }
})
const mockRef = require('@react-navigation/native').__ref

// The route table is shared by both apps; navigation is guarded by the names
// the mounted navigator actually registers, collected from nested state.
describe('collectRouteNames', () => {
  it('collects route names from nested navigator state', () => {
    const state = {
      routeNames: ['Main'],
      routes: [{ name: 'Main', state: { routeNames: ['MainTabs', 'Wallet', 'Notifications'], routes: [
        { name: 'MainTabs', state: { routeNames: ['Dashboard', 'Chat'], routes: [] } },
      ] } }],
    }
    const names = collectRouteNames(state)
    expect([...names].sort()).toEqual(['Chat', 'Dashboard', 'Main', 'MainTabs', 'Notifications', 'Wallet'])
    expect(names.has('DealInvites')).toBe(false)
  })

  it('handles an unmounted navigator', () => {
    expect(collectRouteNames(undefined).size).toBe(0)
  })
})

describe('navigateToNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Brand-like tree: has Wallet and Notifications, lacks DealInvites.
    mockRef.getRootState.mockReturnValue({
      routeNames: ['Main'],
      routes: [{ name: 'Main', state: { routeNames: ['Wallet', 'Notifications'], routes: [] } }],
    })
  })

  it('navigates to a registered screen', () => {
    expect(navigateToNotification({ deep_link: '/dashboard/wallet' })).toBe(true)
    expect(mockRef.navigate).toHaveBeenCalledWith('Main', { screen: 'Wallet', params: undefined })
  })

  it('falls back to Notifications for a screen this app does not register', () => {
    expect(navigateToNotification({ deep_link: '/dashboard/deal-invites' })).toBe(true)
    expect(mockRef.navigate).toHaveBeenCalledWith('Main', { screen: 'Notifications' })
  })
})
