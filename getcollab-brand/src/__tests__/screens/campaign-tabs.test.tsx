import { Alert } from 'react-native'
import { apiService } from '@shared/services/api'
import CampaignEditScreen from '../../app/(main)/brand/campaigns/[id]/edit'
import CampaignDiscoverScreen from '../../app/(main)/brand/campaigns/[id]/discover'
import CampaignResponsesScreen from '../../app/(main)/brand/campaigns/[id]/responses'
import CampaignExecuteScreen from '../../app/(main)/brand/campaigns/[id]/execute'
import CampaignOutreachScreen from '../../app/(main)/brand/campaigns/[id]/outreach'
import CampaignEscrowScreen from '../../app/(main)/brand/campaigns/[id]/escrow'
import CampaignCircleScreen from '../../app/(main)/brand/campaigns/[id]/circle'
import { renderScreen, screen, waitFor, fireEvent } from '../../test-utils/render'

// These screens read the campaign id from route params rather than props, so the
// navigation module is replaced with a stable double exposing the same id.
jest.mock('@react-navigation/native', () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() }
  return {
    __esModule: true,
    __navigation: navigation,
    useRoute: () => ({ params: { id: 'c1', title: 'Summer Launch' } }),
    useNavigation: () => navigation,
    useFocusEffect: (cb: () => void) => require('react').useEffect(cb, [cb]),
  }
})

jest.mock('@shared/services/api', () => {
  const api = {
    getCampaign: jest.fn(),
    updateCampaign: jest.fn(),
    discoverCreators: jest.fn(),
    inviteCreatorToCampaign: jest.fn(),
    getBidsForCampaign: jest.fn(),
    updateBidStatus: jest.fn(),
    createDirectChat: jest.fn(),
    getDeals: jest.fn(),
    getBrandInvites: jest.fn(),
    fetchWalletSummary: jest.fn(),
  }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>
const { __navigation: navigation } = require('@react-navigation/native')

const CAMPAIGN = {
  id: 'c1',
  title: 'Summer Launch',
  description: 'Q2 push',
  budget: 50000,
  status: 'draft',
  startDate: '2026-03-01T00:00:00.000Z',
  endDate: '2026-04-01T00:00:00.000Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  api.getCampaign.mockResolvedValue({ campaign: CAMPAIGN })
  api.discoverCreators.mockResolvedValue({ influencers: [] })
  api.getBidsForCampaign.mockResolvedValue({ data: [] })
  api.getDeals.mockResolvedValue({ deals: [] })
  api.getBrandInvites.mockResolvedValue({ invites: [] })
  api.fetchWalletSummary.mockResolvedValue({})
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
})

describe('CampaignEditScreen', () => {
  it('prefills the form from the campaign', async () => {
    renderScreen(CampaignEditScreen)

    expect(await screen.findByText('Edit Campaign')).toBeOnTheScreen()
    expect(screen.getByDisplayValue('Summer Launch')).toBeOnTheScreen()
    expect(screen.getByDisplayValue('50000')).toBeOnTheScreen()
    expect(api.getCampaign).toHaveBeenCalledWith('c1')
  })

  it('patches the campaign and returns to the detail screen', async () => {
    api.updateCampaign.mockResolvedValue({ success: true })
    renderScreen(CampaignEditScreen)
    await screen.findByDisplayValue('Summer Launch')

    fireEvent.changeText(screen.getByDisplayValue('Summer Launch'), 'Summer Launch v2')
    fireEvent.press(screen.getByText('Save Changes'))

    await waitFor(() => expect(api.updateCampaign).toHaveBeenCalledTimes(1))
    expect(api.updateCampaign).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ title: 'Summer Launch v2', budget: 50000 }),
    )
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('refuses to save without a title', async () => {
    renderScreen(CampaignEditScreen)
    await screen.findByDisplayValue('Summer Launch')

    fireEvent.changeText(screen.getByDisplayValue('Summer Launch'), '   ')
    fireEvent.press(screen.getByText('Save Changes'))

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Title is required')
    expect(api.updateCampaign).not.toHaveBeenCalled()
  })
})

describe('CampaignDiscoverScreen', () => {
  it('scopes discovery to the campaign and shows an empty state', async () => {
    renderScreen(CampaignDiscoverScreen)

    expect(await screen.findByText('Discover Creators')).toBeOnTheScreen()
    expect(api.discoverCreators).toHaveBeenCalledWith({ campaignId: 'c1', limit: 50 })
  })

  it('invites a creator to this campaign', async () => {
    api.discoverCreators.mockResolvedValue({
      influencers: [{ id: 'i1', name: 'Riya', categories: ['Beauty'] }],
    })
    api.inviteCreatorToCampaign.mockResolvedValue({ success: true })
    renderScreen(CampaignDiscoverScreen)
    await screen.findByText('Riya')

    fireEvent.press(screen.getByText('Invite to Campaign'))

    await waitFor(() =>
      expect(api.inviteCreatorToCampaign).toHaveBeenCalledWith('c1', 'i1', 'Join our campaign: Summer Launch'),
    )
  })
})

describe('CampaignResponsesScreen', () => {
  it('lists bids scoped to the campaign', async () => {
    api.getBidsForCampaign.mockResolvedValue({
      data: [{ id: 'b1', status: 'pending', amount: 10000, influencer: { id: 'i1', name: 'Riya' } }],
    })
    renderScreen(CampaignResponsesScreen)

    expect(await screen.findByText('Responses')).toBeOnTheScreen()
    expect(screen.getByText('Riya')).toBeOnTheScreen()
    expect(api.getBidsForCampaign).toHaveBeenCalledWith('c1')
  })

  it('shows an empty state when nothing has applied', async () => {
    renderScreen(CampaignResponsesScreen)

    expect(await screen.findByText('No responses yet')).toBeOnTheScreen()
  })

  it('accepts a bid after confirmation', async () => {
    api.getBidsForCampaign.mockResolvedValue({
      data: [{ id: 'b1', status: 'pending', amount: 10000, influencer: { id: 'i1', name: 'Riya' } }],
    })
    api.updateBidStatus.mockResolvedValue({ success: true })
    renderScreen(CampaignResponsesScreen)
    await screen.findByText('Riya')

    fireEvent.press(screen.getAllByText('Accept')[0])
    // The confirmation modal repeats the label; it renders last.
    fireEvent.press(screen.getAllByText('Accept')[1])

    await waitFor(() => expect(api.updateBidStatus).toHaveBeenCalledWith('b1', 'accepted'))
  })
})

describe('CampaignExecuteScreen', () => {
  it('flattens deal deliverables and shows an empty state when there are none', async () => {
    renderScreen(CampaignExecuteScreen)

    expect(await screen.findByText('Execute')).toBeOnTheScreen()
    expect(screen.getByText('No deliverables yet')).toBeOnTheScreen()
    expect(api.getDeals).toHaveBeenCalledWith({ campaignId: 'c1' })
  })

  it('renders one row per deliverable across deals', async () => {
    api.getDeals.mockResolvedValue({
      deals: [
        { id: 'd1', status: 'in_progress', influencer: { name: 'Riya' }, deliverables: ['Reel', { title: 'Story set' }] },
      ],
    })
    renderScreen(CampaignExecuteScreen)

    expect(await screen.findByText('Reel')).toBeOnTheScreen()
    expect(screen.getByText('Story set')).toBeOnTheScreen()
  })
})

describe('CampaignOutreachScreen', () => {
  it('merges invites and deals into one outreach timeline', async () => {
    api.getBrandInvites.mockResolvedValue({
      invites: [{ id: 'i1', influencerName: 'Riya', status: 'pending', createdAt: '2026-02-01T00:00:00.000Z' }],
    })
    renderScreen(CampaignOutreachScreen)

    expect(await screen.findByText('Outreach')).toBeOnTheScreen()
    expect(screen.getByText('Riya')).toBeOnTheScreen()
    expect(api.getBrandInvites).toHaveBeenCalledWith({ campaignId: 'c1' })
  })

  it('shows an empty state with no outreach', async () => {
    renderScreen(CampaignOutreachScreen)

    expect(await screen.findByText('No outreach yet')).toBeOnTheScreen()
  })
})

describe('CampaignEscrowScreen', () => {
  it('derives escrow rows from the campaign budget and wallet', async () => {
    api.fetchWalletSummary.mockResolvedValue({ reserved_minor: 200000 })
    renderScreen(CampaignEscrowScreen)

    expect(await screen.findByText('Escrow')).toBeOnTheScreen()
    expect(screen.getByText('Campaign budget')).toBeOnTheScreen()
    expect(screen.getByText('Reserved from wallet')).toBeOnTheScreen()
  })

  it('shows an empty state when nothing is funded', async () => {
    api.getCampaign.mockResolvedValue({ campaign: { ...CAMPAIGN, budget: 0 } })
    renderScreen(CampaignEscrowScreen)

    expect(await screen.findByText('No escrow activity')).toBeOnTheScreen()
  })
})

describe('CampaignCircleScreen', () => {
  it('maps deals into the creator circle', async () => {
    api.getDeals.mockResolvedValue({
      deals: [{ id: 'd1', status: 'active', influencer: { name: 'Riya', instagramHandle: '@riya' } }],
    })
    renderScreen(CampaignCircleScreen)

    expect(await screen.findByText('Creator Circle')).toBeOnTheScreen()
    expect(screen.getByText('Riya')).toBeOnTheScreen()
  })

  it('shows an empty state with no creators', async () => {
    renderScreen(CampaignCircleScreen)

    expect(await screen.findByText('No creators yet')).toBeOnTheScreen()
  })
})
