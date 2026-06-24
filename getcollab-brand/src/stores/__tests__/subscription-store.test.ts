import { useSubscriptionStore, getTrialDaysRemaining } from '../subscription-store'
import apiService from '@shared/services/api'

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getSubscriptionStatus: jest.fn(),
    getSubscriptionPricing: jest.fn(),
    startTrial: jest.fn(),
    cancelSubscription: jest.fn(),
    retrySubscription: jest.fn(),
    changeSubscriptionPlan: jest.fn(),
  },
}))

const mockApi = apiService as jest.Mocked<typeof apiService>

describe('subscription-store', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().reset()
    jest.clearAllMocks()
  })

  it('starts in a clean state', () => {
    const state = useSubscriptionStore.getState()
    expect(state.subscription).toBeNull()
    expect(state.loading).toBe(false)
  })

  it('fetchStatus normalizes API response', async () => {
    mockApi.getSubscriptionStatus.mockResolvedValueOnce({
      data: {
        id: 'sub_1',
        status: 'TRIAL',
        plan: 'monthly',
        trialEndsAt: '2026-12-31T00:00:00.000Z',
      },
    })

    await useSubscriptionStore.getState().fetchStatus()

    const sub = useSubscriptionStore.getState().subscription
    expect(sub?.status).toBe('TRIAL')
    expect(sub?.id).toBe('sub_1')
    expect(useSubscriptionStore.getState().loading).toBe(false)
  })

  it('treats {status:NONE} as no subscription', async () => {
    mockApi.getSubscriptionStatus.mockResolvedValueOnce({ status: 'NONE' })
    await useSubscriptionStore.getState().fetchStatus()
    expect(useSubscriptionStore.getState().subscription).toBeNull()
  })

  it('startTrial captures the new subscription', async () => {
    mockApi.startTrial.mockResolvedValueOnce({
      subscription: { status: 'TRIAL', trialEndsAt: '2026-12-31' },
    })
    await useSubscriptionStore.getState().startTrial()
    expect(useSubscriptionStore.getState().subscription?.status).toBe('TRIAL')
  })

  it('startTrial surfaces errors', async () => {
    mockApi.startTrial.mockRejectedValueOnce(new Error('Already used trial'))
    await expect(useSubscriptionStore.getState().startTrial()).rejects.toThrow('Already used trial')
    expect(useSubscriptionStore.getState().error).toBe('Already used trial')
  })
})

describe('getTrialDaysRemaining', () => {
  it('returns null when not in trial', () => {
    expect(getTrialDaysRemaining(null)).toBeNull()
    expect(getTrialDaysRemaining({ status: 'ACTIVE' })).toBeNull()
  })

  it('returns days remaining for active trial', () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    const days = getTrialDaysRemaining({ status: 'TRIAL', trialEndsAt: future })
    expect(days).toBeGreaterThanOrEqual(9)
    expect(days).toBeLessThanOrEqual(10)
  })

  it('clamps expired trials to 0', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(getTrialDaysRemaining({ status: 'TRIAL', trialEndsAt: past })).toBe(0)
  })
})
