import { apiService } from '@shared/services/api'
import AffiliateScreen from '../../app/(main)/brand/affiliate'
import { renderScreen, screen, waitFor, fireEvent } from '../../test-utils/render'

jest.mock('@shared/services/api', () => {
  const api = {
    getAffiliatePrograms: jest.fn(),
    createAffiliateProgram: jest.fn(),
    activateAffiliateProgram: jest.fn(),
    pauseAffiliateProgram: jest.fn(),
  }
  return { __esModule: true, apiService: api, default: api, handleApiError: jest.fn() }
})

const api = apiService as unknown as Record<string, jest.Mock>

const ACTIVE_PROGRAM = { id: 'p1', name: 'Spring Referrals', status: 'active', commissionRate: 10 }

describe('AffiliateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    api.getAffiliatePrograms.mockResolvedValue({ programs: [ACTIVE_PROGRAM] })
  })

  it('lists affiliate programs', async () => {
    renderScreen(AffiliateScreen)

    expect(await screen.findByText('Spring Referrals')).toBeOnTheScreen()
  })

  it('creates a program from the New dialog', async () => {
    api.createAffiliateProgram.mockResolvedValue({ id: 'p2' })
    renderScreen(AffiliateScreen)
    await screen.findByText('Spring Referrals')

    fireEvent.press(screen.getByText('New'))
    fireEvent.changeText(screen.getByPlaceholderText('Program name'), 'Autumn Push')
    fireEvent.press(screen.getByText('Create'))

    await waitFor(() => expect(api.createAffiliateProgram).toHaveBeenCalledTimes(1))
    expect(api.createAffiliateProgram).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Autumn Push' }),
    )
  })

  it('pauses an active program from its status pill', async () => {
    api.pauseAffiliateProgram.mockResolvedValue({ success: true })
    renderScreen(AffiliateScreen)
    await screen.findByText('Spring Referrals')

    // These handlers call e.stopPropagation(), so the synthetic event must be supplied.
    fireEvent.press(screen.getByText('Active'), { stopPropagation: jest.fn() })

    await waitFor(() => expect(api.pauseAffiliateProgram).toHaveBeenCalledWith('p1'))
  })

  it('routes to the program links and commissions screens', async () => {
    const { navigation } = renderScreen(AffiliateScreen)
    await screen.findByText('Spring Referrals')

    const event = { stopPropagation: jest.fn() }
    fireEvent.press(screen.getByText('Links'), event)
    fireEvent.press(screen.getByText('Commissions'), event)

    expect(navigation.navigate).toHaveBeenCalledWith('AffiliateLinks', { programId: 'p1' })
    expect(navigation.navigate).toHaveBeenCalledWith('AffiliateCommissions', { programId: 'p1' })
  })

  it('shows an empty state when no programs exist', async () => {
    api.getAffiliatePrograms.mockResolvedValue({ programs: [] })
    renderScreen(AffiliateScreen)

    expect(await screen.findByText('No programs yet')).toBeOnTheScreen()
  })
})
