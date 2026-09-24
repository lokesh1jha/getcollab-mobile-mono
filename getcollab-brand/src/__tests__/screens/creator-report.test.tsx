import { apiService } from '@shared/services/api'
import CreatorReportScreen from '../../app/(main)/brand/creators/[id]/report'
import { renderScreen, screen } from '../../test-utils/render'

jest.mock('@react-navigation/native', () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() }
  return {
    __esModule: true,
    __navigation: navigation,
    useRoute: () => ({ params: { id: 'i1' } }),
    useNavigation: () => navigation,
    useFocusEffect: (cb: () => void) => require('react').useEffect(cb, [cb]),
  }
})

jest.mock('@shared/services/api', () => {
  const api = { getInfluencer: jest.fn(), getProfileWithMetrics: jest.fn() }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>

describe('CreatorReportScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    api.getInfluencer.mockResolvedValue({
      influencer: {
        name: 'Riya Sharma',
        instagramHandle: 'riya',
        verified: true,
        collabCount: 7,
        instagramMetrics: { followers: 12500, avgEngagement: 4.2, avgLikesPerPost: 800, avgViews: 9000, avgComments: 120 },
        demographics: { age18_24: 60, age25_34: 30, age13_17: 10 },
        genderSplit: { male: 30, female: 68, other: 2 },
        topLocations: ['Mumbai', 'Pune'],
      },
    })
    api.getProfileWithMetrics.mockResolvedValue({ metrics: {} })
  })

  it('summarises the creator with metrics, demographics and gender split', async () => {
    renderScreen(CreatorReportScreen)

    expect(await screen.findByText('Riya Sharma')).toBeOnTheScreen()
    expect(screen.getByText('@riya')).toBeOnTheScreen()
    expect(screen.getByText('Verified')).toBeOnTheScreen()

    // 12,500 followers are rendered in compact form.
    expect(screen.getByText('12.5K')).toBeOnTheScreen()
    expect(screen.getByText('4.2%')).toBeOnTheScreen()
    expect(screen.getByText('7')).toBeOnTheScreen()

    expect(screen.getByText('Performance')).toBeOnTheScreen()
    expect(screen.getByText('Audience age')).toBeOnTheScreen()
    expect(screen.getByText('Audience gender')).toBeOnTheScreen()
    expect(screen.getByText('68%')).toBeOnTheScreen()
    expect(screen.getByText('Mumbai')).toBeOnTheScreen()
  })

  it('hides audience sections instead of inventing data when the creator has none', async () => {
    api.getInfluencer.mockResolvedValue({ influencer: { name: 'Arjun Rao', instagramMetrics: { followers: 900 } } })
    // The signed-in brand's own metrics must never be shown as the creator's.
    api.getProfileWithMetrics.mockResolvedValue({ metrics: { genderSplit: { male: 42, female: 55, other: 3 }, topLocations: ['Delhi'] } })
    renderScreen(CreatorReportScreen)

    expect(await screen.findByText('Arjun Rao')).toBeOnTheScreen()
    expect(screen.queryByText('Audience age')).toBeNull()
    expect(screen.queryByText('Audience gender')).toBeNull()
    expect(screen.queryByText('Top locations')).toBeNull()
    expect(screen.queryByText('55%')).toBeNull()
    expect(screen.queryByText('Delhi')).toBeNull()
    expect(api.getProfileWithMetrics).not.toHaveBeenCalled()
  })

  it('shows a not-found state when the creator cannot be loaded', async () => {
    api.getInfluencer.mockRejectedValue(new Error('nope'))
    renderScreen(CreatorReportScreen)

    expect(await screen.findByText('Report not found')).toBeOnTheScreen()
  })
})
