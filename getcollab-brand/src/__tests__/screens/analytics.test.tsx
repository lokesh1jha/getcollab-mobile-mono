import { apiService } from '@shared/services/api'
import AnalyticsScreen from '../../app/(main)/brand/analytics'
import { renderScreen, screen, waitFor, fireEvent } from '../../test-utils/render'

jest.mock('@shared/services/api', () => {
  const api = { getMyCampaigns: jest.fn(), getRelationships: jest.fn() }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>

describe('AnalyticsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    api.getMyCampaigns.mockResolvedValue({
      campaigns: [
        { id: 'c1', title: 'Summer Launch', budget: 50000, spent: 20000, bidCount: 4, acceptedBids: 2, status: 'active', createdAt: new Date().toISOString() },
      ],
    })
    api.getRelationships.mockResolvedValue({
      relationships: [{ id: 'r1', otherParty: { name: 'Priya Nair' }, totalCollaborations: 3, totalSpend: 12000, averageRating: 4.5 }],
    })
  })

  it('rolls campaign metrics up into headline totals', async () => {
    renderScreen(AnalyticsScreen)

    expect(await screen.findByText('Analytics')).toBeOnTheScreen()
    expect(screen.getByText('Total budget')).toBeOnTheScreen()
    expect(screen.getByText('₹50,000')).toBeOnTheScreen()
    expect(screen.getByText('₹20,000')).toBeOnTheScreen()
    expect(screen.getByText('4')).toBeOnTheScreen()
  })

  it('defaults to the campaign tab and switches to creator performance', async () => {
    renderScreen(AnalyticsScreen)
    await screen.findByText('Analytics')

    expect(screen.getByText('Budget vs spent')).toBeOnTheScreen()
    expect(screen.queryByText('Priya Nair')).not.toBeOnTheScreen()

    fireEvent.press(screen.getByText('Creators'))

    await waitFor(() => expect(screen.getByText('Priya Nair')).toBeOnTheScreen())
    expect(screen.queryByText('Budget vs spent')).not.toBeOnTheScreen()
  })

  it('leaves campaigns older than six months out of the chart instead of charting zeros', async () => {
    api.getMyCampaigns.mockResolvedValue({
      campaigns: [{ id: 'c0', title: 'Old', budget: 9000, spent: 1000, bidCount: 1, acceptedBids: 0, status: 'completed', createdAt: '2020-02-01T00:00:00.000Z' }],
    })
    renderScreen(AnalyticsScreen)
    await screen.findByText('Analytics')

    expect(screen.queryByText('Budget vs spent')).not.toBeOnTheScreen()
  })

  it('shows an empty state when there is nothing to analyse', async () => {
    api.getMyCampaigns.mockResolvedValue({ campaigns: [] })
    api.getRelationships.mockResolvedValue({ relationships: [] })
    renderScreen(AnalyticsScreen)

    expect(await screen.findByText('No data yet')).toBeOnTheScreen()
  })
})
