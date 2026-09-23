import { Alert, Switch } from 'react-native'
import { Linking } from 'react-native'
import { apiService } from '@shared/services/api'
import { useSubscriptionStore } from '../../stores/subscription-store'
import SettingsShellScreen from '../../app/(main)/settings'
import ProfileSettingsScreen from '../../app/(main)/settings/profile'
import AccountSettingsScreen from '../../app/(main)/settings/account'
import SecuritySettingsScreen from '../../app/(main)/settings/security'
import TeamSettingsScreen from '../../app/(main)/settings/team'
import BillingSettingsScreen from '../../app/(main)/settings/billing'
import NotificationsSettingsScreen from '../../app/(main)/settings/notifications'
import { renderScreen, screen, waitFor, fireEvent } from '../../test-utils/render'

jest.mock('@shared/services/api', () => {
  const api = {
    getProfile: jest.fn(),
    updateGeneralProfile: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    updateNotificationSettings: jest.fn(),
    changePassword: jest.fn(),
    getTeamMembers: jest.fn(),
    inviteTeamMember: jest.fn(),
    removeTeamMember: jest.fn(),
    getInvoices: jest.fn(),
    downloadInvoice: jest.fn(),
    deleteAccount: jest.fn(),
    get: jest.fn(),
  }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const mockUpdateProfile = jest.fn(() => Promise.resolve())
jest.mock('@shared/stores/auth-store', () => {
  const useAuthStore: any = () => ({
    user: { id: 'u1', name: 'Acme Brand', email: 'ops@acme.test' },
    updateProfile: mockUpdateProfile,
  })
  useAuthStore.getState = () => ({ updateProfile: mockUpdateProfile, isAuthenticated: true })
  useAuthStore.subscribe = jest.fn()
  useAuthStore.setState = jest.fn()
  return { useAuthStore }
})

const api = apiService as unknown as Record<string, jest.Mock>

const INVOICE = { id: 'inv_1', description: 'Pro plan', amount: 4999, status: 'paid', createdAt: '2026-02-10T00:00:00.000Z' }

beforeEach(() => {
  jest.clearAllMocks()
  api.getProfile.mockResolvedValue({ profile: { name: 'Acme Brand', bio: 'We make things', websiteUrl: 'https://acme.test', industry: 'Retail', location: 'Mumbai' } })
  api.getSettings.mockResolvedValue({ settings: { name: 'Acme Brand', email: 'ops@acme.test', phoneNumbers: ['9999999999'], notifications: {} } })
  api.getTeamMembers.mockResolvedValue({ members: [{ id: 'm1', name: 'Dana', email: 'dana@acme.test', role: 'owner' }] })
  api.get.mockResolvedValue({ invites: [] })
  api.getInvoices.mockResolvedValue({ invoices: [INVOICE] })
  api.downloadInvoice.mockResolvedValue({ downloadUrl: 'https://cdn.getcollab.in/inv_1.pdf' })
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
  useSubscriptionStore.setState({ subscription: { status: 'ACTIVE', plan: 'Pro' } })
})

describe('Settings shell', () => {
  it('lists every settings section', () => {
    renderScreen(SettingsShellScreen)

    for (const label of ['Profile', 'Account', 'Security', 'Notifications', 'Team', 'Billing']) {
      expect(screen.getByText(label)).toBeOnTheScreen()
    }
  })

  it('routes each section to its screen, mapping notifications to its own route name', () => {
    const { navigation } = renderScreen(SettingsShellScreen)

    fireEvent.press(screen.getByText('Team'))
    expect(navigation.navigate).toHaveBeenCalledWith('Team')

    fireEvent.press(screen.getByText('Notifications'))
    expect(navigation.navigate).toHaveBeenCalledWith('NotificationSettings')
  })
})

describe('ProfileSettingsScreen', () => {
  it('prefills the brand profile from the API', async () => {
    renderScreen(ProfileSettingsScreen)

    expect(await screen.findByDisplayValue('Acme Brand')).toBeOnTheScreen()
    expect(screen.getByDisplayValue('https://acme.test')).toBeOnTheScreen()
    expect(screen.getByDisplayValue('Mumbai')).toBeOnTheScreen()
  })

  it('saves through both the auth store and the general profile endpoint', async () => {
    api.updateGeneralProfile.mockResolvedValue({ success: true })
    renderScreen(ProfileSettingsScreen)
    await screen.findByDisplayValue('Acme Brand')

    fireEvent.changeText(screen.getByDisplayValue('Acme Brand'), 'Acme Ltd')
    fireEvent.press(screen.getByText('Save Changes'))

    await waitFor(() => expect(api.updateGeneralProfile).toHaveBeenCalledTimes(1))
    expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({ name: 'Acme Ltd' }))
  })
})

describe('AccountSettingsScreen', () => {
  it('prefills contact details and saves phone numbers as an array', async () => {
    api.updateSettings.mockResolvedValue({ success: true })
    renderScreen(AccountSettingsScreen)

    expect(await screen.findByDisplayValue('ops@acme.test')).toBeOnTheScreen()
    fireEvent.changeText(screen.getByDisplayValue('9999999999'), '8888888888')
    fireEvent.press(screen.getByText('Save Changes'))

    await waitFor(() =>
      expect(api.updateSettings).toHaveBeenCalledWith({ phoneNumbers: ['8888888888'] }),
    )
  })
})

describe('SecuritySettingsScreen', () => {
  it('blocks mismatched passwords locally', async () => {
    renderScreen(SecuritySettingsScreen)

    const inputs = screen.UNSAFE_getAllByType(require('react-native').TextInput)
    fireEvent.changeText(inputs[0], 'old-password')
    fireEvent.changeText(inputs[1], 'new-password-1')
    fireEvent.changeText(inputs[2], 'new-password-2')
    fireEvent.press(screen.getByText('Update Password'))

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match')
    expect(api.changePassword).not.toHaveBeenCalled()
  })

  it('changes the password when the confirmation matches', async () => {
    api.changePassword.mockResolvedValue({ success: true })
    renderScreen(SecuritySettingsScreen)

    const inputs = screen.UNSAFE_getAllByType(require('react-native').TextInput)
    fireEvent.changeText(inputs[0], 'old-password')
    fireEvent.changeText(inputs[1], 'new-password-1')
    fireEvent.changeText(inputs[2], 'new-password-1')
    fireEvent.press(screen.getByText('Update Password'))

    await waitFor(() => expect(api.changePassword).toHaveBeenCalledWith('old-password', 'new-password-1'))
  })
})

describe('TeamSettingsScreen', () => {
  it('lists members with their role', async () => {
    renderScreen(TeamSettingsScreen)

    expect(await screen.findByText('Dana')).toBeOnTheScreen()
    expect(screen.getByText('owner · dana@acme.test')).toBeOnTheScreen()
    // The owner is the only member that cannot be removed.
    expect(screen.queryByText('Remove')).not.toBeOnTheScreen()
  })

  it('invites a teammate by email', async () => {
    api.inviteTeamMember.mockResolvedValue({ success: true })
    renderScreen(TeamSettingsScreen)
    await screen.findByText('Dana')

    fireEvent.changeText(screen.getByPlaceholderText('colleague@company.com'), 'new@acme.test')
    fireEvent.press(screen.getByText('Invite'))

    await waitFor(() => expect(api.inviteTeamMember).toHaveBeenCalledWith('new@acme.test'))
  })
})

describe('BillingSettingsScreen', () => {
  it('shows the current plan and invoice list', async () => {
    renderScreen(BillingSettingsScreen)

    expect(await screen.findByText('Billing')).toBeOnTheScreen()
    expect(screen.getByText('Pro')).toBeOnTheScreen()
    expect(screen.getByText('Pro plan')).toBeOnTheScreen()
  })

  it('downloads an invoice by opening its URL', async () => {
    renderScreen(BillingSettingsScreen)
    await screen.findByText('Pro plan')

    fireEvent.press(screen.getByText('Pro plan'))

    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://cdn.getcollab.in/inv_1.pdf'))
  })
})

describe('NotificationsSettingsScreen', () => {
  it('renders an email and push toggle per event type', async () => {
    renderScreen(NotificationsSettingsScreen)

    expect(await screen.findByText('Email and push preferences')).toBeOnTheScreen()
    expect(screen.getAllByText('Campaign Updates')).toHaveLength(2)
    // 4 email toggles + 3 push toggles
    // Six: the weekly digest had no backend and was removed.
    expect(screen.UNSAFE_getAllByType(Switch)).toHaveLength(6)
  })

  it('persists a toggle change', async () => {
    api.updateNotificationSettings.mockResolvedValue({ success: true })
    renderScreen(NotificationsSettingsScreen)
    await screen.findByText('Email and push preferences')

    fireEvent(screen.UNSAFE_getAllByType(Switch)[0], 'valueChange', true)

    await waitFor(() =>
      expect(api.updateNotificationSettings).toHaveBeenCalledWith({ emailCampaignUpdates: true }),
    )
  })
})
