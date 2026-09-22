import { apiService } from '@shared/services/api'
import { useNotificationStore } from '@shared/stores/notification-store'
import NotificationsScreen from '../../app/(main)/notifications'
import { renderScreen, screen, waitFor, fireEvent } from '../../test-utils/render'

// The push handler and the in-app list both route through the container ref, so
// the ref is replaced with a spy to assert where a tap lands.
jest.mock('@react-navigation/native', () => {
  const navigate = jest.fn()
  return {
    __esModule: true,
    __navigate: navigate,
    createNavigationContainerRef: () => ({ isReady: () => true, navigate }),
    useFocusEffect: (cb: () => void) => require('react').useEffect(cb, [cb]),
  }
})

jest.mock('@shared/services/api', () => {
  const api = {
    getNotifications: jest.fn(),
    markNotificationAsRead: jest.fn(),
    markAllNotificationsAsRead: jest.fn(),
  }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>
const { __navigate: navigate } = require('@react-navigation/native')

const notification = (over: Record<string, unknown>) => ({
  id: 'n1',
  title: 'Wallet topped up',
  message: 'Funds are available',
  read: false,
  createdAt: new Date().toISOString(),
  ...over,
})

beforeEach(() => {
  jest.clearAllMocks()
  useNotificationStore.getState().reset()
  api.markNotificationAsRead.mockResolvedValue({ success: true })
})

describe('NotificationsScreen deep links', () => {
  it('opens the wallet when the notification carries a wallet deep link', async () => {
    api.getNotifications.mockResolvedValue({
      notifications: [notification({ deepLink: '/dashboard/wallet', type: 'wallet.topped_up' })],
    })
    renderScreen(NotificationsScreen)

    fireEvent.press(await screen.findByText('Wallet topped up'))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('Main', { screen: 'Wallet', params: undefined }))
    expect(api.markNotificationAsRead).toHaveBeenCalledWith('n1')
  })

  it('routes a relationship notification to the relationship detail', async () => {
    api.getNotifications.mockResolvedValue({
      notifications: [notification({ title: 'New relationship', deepLink: '/dashboard/relationships/r7' })],
    })
    renderScreen(NotificationsScreen)

    fireEvent.press(await screen.findByText('New relationship'))

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('Main', {
        screen: 'RelationshipDetail',
        params: { id: 'r7' },
      }),
    )
  })

  it('routes an invite notification with no deep link via its event type', async () => {
    api.getNotifications.mockResolvedValue({
      notifications: [notification({ title: 'Invite accepted', type: 'invite.accepted' })],
    })
    renderScreen(NotificationsScreen)

    fireEvent.press(await screen.findByText('Invite accepted'))

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('Main', { screen: 'Invites', params: undefined }))
  })

  it('stays put for a notification with nothing to route on', async () => {
    api.getNotifications.mockResolvedValue({
      notifications: [notification({ title: 'Heads up', type: 'system.announcement' })],
    })
    renderScreen(NotificationsScreen)

    fireEvent.press(await screen.findByText('Heads up'))

    await waitFor(() => expect(api.markNotificationAsRead).toHaveBeenCalledWith('n1'))
    expect(navigate).not.toHaveBeenCalled()
  })
})
