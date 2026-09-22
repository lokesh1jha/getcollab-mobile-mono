import { Linking } from 'react-native'
import { apiService } from '@shared/services/api'
import GrowthOverviewScreen from '../../app/(main)/brand/growth'
import GrowthSetupScreen from '../../app/(main)/brand/growth/setup'
import GrowthSeoScreen from '../../app/(main)/brand/growth/seo'
import GrowthSearchConsoleScreen from '../../app/(main)/brand/growth/search-console'
import GrowthAiVisibilityScreen from '../../app/(main)/brand/growth/ai-visibility'
import GrowthOpportunitiesScreen from '../../app/(main)/brand/growth/opportunities'
import GrowthRecommendationsScreen from '../../app/(main)/brand/growth/recommendations'
import { renderScreen, screen, waitFor, fireEvent, act } from '../../test-utils/render'

jest.mock('@shared/services/api', () => {
  const api = {
    getGrowthSite: jest.fn(),
    upsertGrowthSite: jest.fn(),
    analyzeGrowthSite: jest.fn(),
    getGrowthJob: jest.fn(),
    getGrowthOverview: jest.fn(),
    getGrowthSeo: jest.fn(),
    getGrowthRecommendations: jest.fn(),
    setGrowthRecommendationStatus: jest.fn(),
    connectGrowthSearchConsole: jest.fn(),
    getGrowthSearchConsoleProperties: jest.fn(),
    selectGrowthSearchConsoleProperty: jest.fn(),
    syncGrowthSearchConsole: jest.fn(),
    getGrowthSearchConsole: jest.fn(),
    getGrowthOpportunities: jest.fn(),
    getGrowthAiVisibility: jest.fn(),
    scanGrowthAiVisibility: jest.fn(),
    askGrowthCopilot: jest.fn(),
    getGrowthCreatorHandoff: jest.fn(),
  }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>

const SITE = { id: 's1', websiteUrl: 'https://acme.test', host: 'acme.test' }

/** The API client throws the envelope's `code`, not the HTTP status. */
const notFound = () => Object.assign(new Error('not found'), { code: 'not_found' })

beforeEach(() => {
  jest.clearAllMocks()
  api.getGrowthSite.mockResolvedValue(SITE)
  api.getGrowthOverview.mockResolvedValue({})
  api.getGrowthSeo.mockResolvedValue({ issues: [], readiness: null, score: null })
  api.getGrowthRecommendations.mockResolvedValue({ recommendations: [] })
  api.getGrowthSearchConsole.mockResolvedValue({ connection: { connected: false, available: true }, queries: [] })
  api.getGrowthOpportunities.mockResolvedValue({ opportunities: [] })
  api.getGrowthAiVisibility.mockResolvedValue({ available: true, score: null, providers: [] })
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
})

describe('Growth — site gate', () => {
  it('sends the brand to setup when no website is tracked yet', async () => {
    api.getGrowthSite.mockRejectedValue(notFound())
    const { navigation } = renderScreen(GrowthOverviewScreen)

    expect(await screen.findByText('Add your website')).toBeOnTheScreen()

    fireEvent.press(screen.getByText('Set up Growth'))
    expect(navigation.navigate).toHaveBeenCalledWith('GrowthSetup')
  })

  it('reports a real load failure rather than pretending there is no site', async () => {
    api.getGrowthSite.mockRejectedValue(new Error('boom'))
    renderScreen(GrowthOverviewScreen)

    expect(await screen.findByText('boom')).toBeOnTheScreen()
  })
})

describe('Growth — setup', () => {
  it('saves the website, starts the crawl, and returns to the overview', async () => {
    api.upsertGrowthSite.mockResolvedValue({ id: 's1', host: 'acme.test' })
    api.analyzeGrowthSite.mockResolvedValue({ jobId: 'j1', status: 'queued' })
    const { navigation } = renderScreen(GrowthSetupScreen)

    fireEvent.changeText(screen.getByPlaceholderText('https://yourbrand.com'), 'https://acme.test')
    fireEvent.press(screen.getByText('Analyze'))

    await waitFor(() => expect(api.upsertGrowthSite).toHaveBeenCalledWith('https://acme.test'))
    expect(api.analyzeGrowthSite).toHaveBeenCalledWith('s1')
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('Growth'))
  })
})

describe('Growth — overview', () => {
  const overview = {
    score: {
      overall: 72,
      algorithmVersion: 'v3',
      trend: 4,
      signals: [
        { key: 'seo', name: 'SEO Health', score: 80 },
        { key: 'ai', name: 'AI Readiness', score: null },
      ],
    },
    issueCounts: { critical: 2, warning: 5, info: 1 },
    topRecommendations: [{ id: 'r1', title: 'Add FAQ schema', summary: 'Helps answer engines', dimension: 'ai_readiness' }],
    contentClusters: [{ name: 'Skincare', coverage: 60 }],
    searchConsole: { connected: false },
    aiVisibility: { score: null, reason: 'Not configured' },
  }

  it('renders the score, signals and issue counts', async () => {
    api.getGrowthOverview.mockResolvedValue(overview)
    renderScreen(GrowthOverviewScreen)

    expect(await screen.findByText('72')).toBeOnTheScreen()
    expect(screen.getByText('SEO Health')).toBeOnTheScreen()
    // An unconnected signal stays blank instead of showing a misleading 0.
    expect(screen.getByText('—')).toBeOnTheScreen()
    expect(screen.getByText('Fix first')).toBeOnTheScreen()
    expect(screen.getByText('2')).toBeOnTheScreen()
    expect(screen.getByText('Add FAQ schema')).toBeOnTheScreen()
    expect(screen.getByText('Skincare')).toBeOnTheScreen()
  })

  it('drills into SEO pre-filtered by the tapped issue count', async () => {
    api.getGrowthOverview.mockResolvedValue(overview)
    const { navigation } = renderScreen(GrowthOverviewScreen)
    await screen.findByText('Fix first')

    fireEvent.press(screen.getByText('Fix first'))

    expect(navigation.navigate).toHaveBeenCalledWith('GrowthSeo', { severity: 'critical' })
  })

  it('starts an analysis and reports the crawl as it runs', async () => {
    jest.useFakeTimers()
    try {
      api.analyzeGrowthSite.mockResolvedValue({ jobId: 'j1', status: 'queued' })
      api.getGrowthJob.mockResolvedValue({ id: 'j1', status: 'running', pagesCrawled: 12 })
      renderScreen(GrowthOverviewScreen)
      await screen.findByText('Run analysis')

      fireEvent.press(screen.getByText('Run analysis'))
      // Flush the analyze promise so the job is scheduled, then fire one poll tick
      // and flush the job response.
      await act(async () => {})
      await act(async () => {
        jest.advanceTimersByTime(3000)
      })
      await act(async () => {})

      expect(api.analyzeGrowthSite).toHaveBeenCalledWith('s1')
      expect(api.getGrowthJob).toHaveBeenCalledWith('j1')
      expect(screen.getByText(/12 pages so far/)).toBeOnTheScreen()
    } finally {
      jest.useRealTimers()
    }
  })

  it('offers the first analysis when nothing has been scored yet', async () => {
    renderScreen(GrowthOverviewScreen)

    expect(await screen.findByText('No analysis yet')).toBeOnTheScreen()
    expect(screen.getByText('Analyze website')).toBeOnTheScreen()
  })
})

describe('Growth — SEO', () => {
  it('lists issues with severity and dimension labels', async () => {
    api.getGrowthSeo.mockResolvedValue({
      score: { overall: 61, algorithmVersion: 'v3' },
      readiness: { hasSitemap: true, hasRobots: false },
      issues: [
        {
          id: 'i1',
          severity: 'critical',
          dimension: 'technical',
          title: 'Missing meta description',
          summary: 'Search engines fall back to page text.',
          pageUrl: 'https://acme.test/pricing',
        },
      ],
    })
    renderScreen(GrowthSeoScreen)

    expect(await screen.findByText('Missing meta description')).toBeOnTheScreen()
    // Once as the severity filter chip, once as the issue's own pill.
    expect(screen.getAllByText('Fix first')).toHaveLength(2)
    expect(screen.getByText('SEO Health')).toBeOnTheScreen()
    expect(screen.getByText('https://acme.test/pricing')).toBeOnTheScreen()
  })

  it('renders the AI readiness checklist with pass and fail marks', async () => {
    api.getGrowthSeo.mockResolvedValue({ readiness: { hasSitemap: true, hasRobots: false } })
    renderScreen(GrowthSeoScreen)

    expect(await screen.findByText('AI Readiness')).toBeOnTheScreen()
    expect(screen.getByText('Sitemap')).toBeOnTheScreen()
    expect(screen.getByText('robots.txt')).toBeOnTheScreen()
    expect(screen.getAllByText('✓')).toHaveLength(1)
    expect(screen.getAllByText('✗')).toHaveLength(7)
  })

  it('refetches with the selected severity', async () => {
    renderScreen(GrowthSeoScreen)
    await screen.findByText('Plain-language checks on your public pages')

    fireEvent.press(screen.getByText('Worth fixing'))

    await waitFor(() => expect(api.getGrowthSeo).toHaveBeenCalledWith('s1', 'warning'))
  })

  it('honours the severity passed in from the overview', async () => {
    renderScreen(GrowthSeoScreen, { route: { params: { severity: 'critical' } } })

    await waitFor(() => expect(api.getGrowthSeo).toHaveBeenCalledWith('s1', 'critical'))
  })

  it('shows an empty state when a filter matches nothing', async () => {
    renderScreen(GrowthSeoScreen)

    expect(await screen.findByText('No issues found')).toBeOnTheScreen()
  })
})

describe('Growth — Search Console', () => {
  it('opens the Google OAuth URL when connecting', async () => {
    api.connectGrowthSearchConsole.mockResolvedValue({ url: 'https://accounts.google.com/o/oauth2/auth?x=1' })
    renderScreen(GrowthSearchConsoleScreen)
    await screen.findByText('Connect Google Search Console')

    fireEvent.press(screen.getByText('Connect Google'))

    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/auth?x=1'),
    )
  })

  it('explains when Search Console is unavailable on the plan', async () => {
    api.getGrowthSearchConsole.mockResolvedValue({
      connection: { connected: false, available: false, unavailableReason: 'Upgrade to connect Google' },
    })
    renderScreen(GrowthSearchConsoleScreen)

    expect(await screen.findByText('Search Console isn’t available on this plan')).toBeOnTheScreen()
    expect(screen.getByText('Upgrade to connect Google')).toBeOnTheScreen()
  })

  it('renders real query rows once a property is connected', async () => {
    api.getGrowthSearchConsole.mockResolvedValue({
      connection: { connected: true, available: true, selectedProperty: 'acme.test' },
      queries: [{ query: 'best skincare brand', page: '/', clicks: 12, impressions: 480, ctr: 0.025, position: 8.4 }],
    })
    renderScreen(GrowthSearchConsoleScreen)

    expect(await screen.findByText('best skincare brand')).toBeOnTheScreen()
    expect(screen.getByText(/12 clicks · shown 480 · avg position 8.4/)).toBeOnTheScreen()
  })

  it('lets the brand pick a property before syncing', async () => {
    api.getGrowthSearchConsole.mockResolvedValue({ connection: { connected: true, available: true }, queries: [] })
    api.getGrowthSearchConsoleProperties.mockResolvedValue({ properties: ['acme.test', 'www.acme.test'] })
    api.selectGrowthSearchConsoleProperty.mockResolvedValue({ ok: true })
    renderScreen(GrowthSearchConsoleScreen)

    expect(await screen.findByText('Choose a property')).toBeOnTheScreen()
    fireEvent.press(await screen.findByText('www.acme.test'))
    fireEvent.press(screen.getByText('Save'))

    await waitFor(() =>
      expect(api.selectGrowthSearchConsoleProperty).toHaveBeenCalledWith('s1', 'www.acme.test'),
    )
  })
})

describe('Growth — AI Visibility', () => {
  it('explains the feature is not configured rather than showing a zero', async () => {
    api.getGrowthAiVisibility.mockResolvedValue({ available: false, reason: 'No provider API keys' })
    renderScreen(GrowthAiVisibilityScreen)

    expect(await screen.findByText('AI Visibility isn’t configured')).toBeOnTheScreen()
    expect(screen.getByText('No provider API keys')).toBeOnTheScreen()
  })

  it('renders provider results and the prompts where the brand was absent', async () => {
    api.getGrowthAiVisibility.mockResolvedValue({
      available: true,
      score: 44,
      mentionRate: 0.4,
      citationRate: 0.2,
      providers: [{ name: 'openai', mentioned: true, results: 10 }],
      missingQueries: ['best crm for agencies'],
    })
    renderScreen(GrowthAiVisibilityScreen)

    expect(await screen.findByText('44')).toBeOnTheScreen()
    expect(screen.getByText('40%')).toBeOnTheScreen()
    expect(screen.getByText('Openai')).toBeOnTheScreen()
    expect(screen.getByText(/best crm for agencies/)).toBeOnTheScreen()
  })

  it('splits a copilot answer into observed, interpretation and recommendation', async () => {
    api.getGrowthAiVisibility.mockResolvedValue({ available: true, score: 44, providers: [] })
    api.askGrowthCopilot.mockResolvedValue({
      observed: ['18 pages crawled'],
      interpretation: ['Thin content'],
      recommendation: ['Publish a buying guide'],
    })
    renderScreen(GrowthAiVisibilityScreen)
    await screen.findByText('Ask about this site')

    fireEvent.changeText(
      screen.getByPlaceholderText('e.g. What should we fix first to get more search traffic?'),
      'What should we fix first?',
    )
    fireEvent.press(screen.getByText('Ask'))

    await waitFor(() => expect(api.askGrowthCopilot).toHaveBeenCalledWith('s1', 'What should we fix first?'))
    expect(await screen.findByText('OBSERVED')).toBeOnTheScreen()
    expect(screen.getByText('• 18 pages crawled')).toBeOnTheScreen()
    expect(screen.getByText('• Publish a buying guide')).toBeOnTheScreen()
  })
})

describe('Growth — Opportunities', () => {
  it('lists opportunities with their metrics', async () => {
    api.getGrowthOpportunities.mockResolvedValue({
      opportunities: [
        { id: 'o1', kind: 'page_2', query: 'vegan skincare', summary: 'You rank just off page one', position: 12.3, impressions: 900, clicks: 4, branded: false },
      ],
    })
    renderScreen(GrowthOpportunitiesScreen)

    expect(await screen.findByText('vegan skincare')).toBeOnTheScreen()
    expect(screen.getByText('Almost on page one')).toBeOnTheScreen()
    expect(screen.getByText(/Avg position 12.3 · shown 900 · clicks 4/)).toBeOnTheScreen()
  })

  it('points at Search Console when there is nothing to show yet', async () => {
    const { navigation } = renderScreen(GrowthOpportunitiesScreen)

    expect(await screen.findByText('No opportunities yet')).toBeOnTheScreen()
    fireEvent.press(screen.getByText('Open Search Console'))
    expect(navigation.navigate).toHaveBeenCalledWith('GrowthSearchConsole')
  })
})

describe('Growth — Recommendations', () => {
  const rec = {
    id: 'r1',
    dimension: 'content',
    status: 'open',
    title: 'Publish a buying guide',
    summary: 'Targets a topic you already rank for',
    impact: 8,
    confidence: 7,
    effort: 3,
  }

  it('shows impact, confidence and effort', async () => {
    api.getGrowthRecommendations.mockResolvedValue({ recommendations: [rec] })
    renderScreen(GrowthRecommendationsScreen)

    expect(await screen.findByText('Publish a buying guide')).toBeOnTheScreen()
    expect(screen.getByText('Content Coverage')).toBeOnTheScreen()
    expect(screen.getByText('Impact 8 · Confidence 7 · Effort 3')).toBeOnTheScreen()
  })

  it('approves a recommendation', async () => {
    api.getGrowthRecommendations.mockResolvedValue({ recommendations: [rec] })
    api.setGrowthRecommendationStatus.mockResolvedValue({ ok: true })
    renderScreen(GrowthRecommendationsScreen)
    await screen.findByText('Publish a buying guide')

    fireEvent.press(screen.getByText('Approve'))

    await waitFor(() => expect(api.setGrowthRecommendationStatus).toHaveBeenCalledWith('r1', 'approved'))
  })

  it('only offers Mark done once a recommendation is approved', async () => {
    api.getGrowthRecommendations.mockResolvedValue({ recommendations: [{ ...rec, status: 'approved' }] })
    renderScreen(GrowthRecommendationsScreen)
    await screen.findByText('Publish a buying guide')

    expect(screen.getByText('Mark done')).toBeOnTheScreen()
    expect(screen.queryByText('Approve')).not.toBeOnTheScreen()
    expect(screen.queryByText('Dismiss')).not.toBeOnTheScreen()
  })

  it('hands the recommendation keyword to creator search', async () => {
    api.getGrowthRecommendations.mockResolvedValue({ recommendations: [rec] })
    api.getGrowthCreatorHandoff.mockResolvedValue({ target_keyword: 'vegan skincare', href: '/dashboard/creators' })
    const { navigation } = renderScreen(GrowthRecommendationsScreen)
    await screen.findByText('Publish a buying guide')

    fireEvent.press(screen.getByText('Find creators'))

    await waitFor(() =>
      expect(navigation.navigate).toHaveBeenCalledWith('Creators', { keyword: 'vegan skincare' }),
    )
  })

  it('shows an empty state before the first analysis', async () => {
    renderScreen(GrowthRecommendationsScreen)

    expect(await screen.findByText('No recommendations yet')).toBeOnTheScreen()
  })
})
