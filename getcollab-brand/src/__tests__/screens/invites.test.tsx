import { Alert } from 'react-native'
import { apiService } from '@shared/services/api'
import InvitesScreen from '../../app/(main)/brand/invites'
import { renderScreen, screen, waitFor, fireEvent } from '../../test-utils/render'

jest.mock('@shared/services/api', () => {
  const api = { getBrandInvites: jest.fn(), cancelBrandInvite: jest.fn() }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>

const PENDING_INVITE = {
  id: 'i1',
  influencerName: 'Neha Kapoor',
  campaignTitle: 'Summer Launch',
  status: 'pending',
  createdAt: '2026-02-01T00:00:00.000Z',
  message: 'We would love to work with you',
}

describe('InvitesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    api.getBrandInvites.mockResolvedValue({ invites: [PENDING_INVITE] })
    // Cancellation is confirmed through an Alert; run the destructive button.
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.()
    })
  })

  it('lists sent invites with their campaign and status', async () => {
    renderScreen(InvitesScreen)

    expect(await screen.findByText('Neha Kapoor')).toBeOnTheScreen()
    expect(screen.getByText('Summer Launch')).toBeOnTheScreen()
    expect(screen.getByText('Pending')).toBeOnTheScreen()
  })

  it('offers cancellation for a pending invite', async () => {
    renderScreen(InvitesScreen)

    expect(await screen.findByText('Cancel Invite')).toBeOnTheScreen()
  })

  it('does not offer cancellation once the invite is accepted', async () => {
    api.getBrandInvites.mockResolvedValue({ invites: [{ ...PENDING_INVITE, status: 'accepted' }] })
    renderScreen(InvitesScreen)

    expect(await screen.findByText('Accepted')).toBeOnTheScreen()
    expect(screen.queryByText('Cancel Invite')).not.toBeOnTheScreen()
  })

  it('cancels the invite and reflects the new status locally', async () => {
    api.cancelBrandInvite.mockResolvedValue({ success: true })
    renderScreen(InvitesScreen)
    await screen.findByText('Cancel Invite')

    fireEvent.press(screen.getByText('Cancel Invite'))

    await waitFor(() => expect(api.cancelBrandInvite).toHaveBeenCalledWith('i1'))
    expect(await screen.findByText('Cancelled')).toBeOnTheScreen()
  })

  it('shows an empty state when nothing has been sent', async () => {
    api.getBrandInvites.mockResolvedValue({ invites: [] })
    renderScreen(InvitesScreen)

    expect(await screen.findByText('No invites yet')).toBeOnTheScreen()
  })
})
