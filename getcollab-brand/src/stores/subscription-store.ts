import { create } from 'zustand'
import { Linking, Alert, AppState, AppStateStatus } from 'react-native'
import { useEffect, useRef } from 'react'
import apiService from '@shared/services/api'
import { logger } from '@shared/services/logger'
import type { Subscription, SubscriptionStatus } from '@shared/types'

const BILLING_PORTAL_URL = '/billing'
const STALE_THRESHOLD_MS = 5 * 60 * 1000
const BACKGROUND_REFRESH_INTERVAL_MS = 60 * 1000
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1000

interface SubscriptionState {
  subscription: Subscription | null
  loading: boolean
  error: string | null
  lastFetchedAt: number | null
  retryCount: number

  fetchStatus: () => Promise<void>
  startTrial: () => Promise<void>
  syncSubscription: () => Promise<void>
  refreshIfStale: () => Promise<void>
  openBillingPortal: () => Promise<void>
  reset: () => void
}

const normalizeSubscription = (raw: any): Subscription | null => {
  if (!raw) return null
  if (raw.status === 'NONE' && !raw.id) return null
  const status = (raw.status || 'NONE') as SubscriptionStatus
  return {
    id: raw.id,
    status,
    plan: raw.plan,
    billing: raw.billing,
    trialEndsAt: raw.trialEndsAt || raw.trial_ends_at,
    currentPeriodStart: raw.currentPeriodStart || raw.current_period_start,
    currentPeriodEnd: raw.currentPeriodEnd || raw.current_period_end,
    cancelAtPeriodEnd: raw.cancelAtPeriodEnd ?? raw.cancel_at_period_end,
    cancelledAt: raw.cancelledAt,
    inGracePeriod: raw.inGracePeriod,
    graceEndsAt: raw.graceEndsAt,
    daysRemaining: raw.daysRemaining,
    amount: raw.amount,
    currency: raw.currency,
  }
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscription: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
  retryCount: 0,

  fetchStatus: async () => {
    set({ loading: true, error: null })
    try {
      const response = await apiService.get('/subscriptions/mobile-status')
      const data = response?.data || response
      set({ subscription: normalizeSubscription(data), loading: false, lastFetchedAt: Date.now(), retryCount: 0 })
    } catch (error: any) {
      const retryCount = get().retryCount
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount)
        logger.warn('Subscription fetch failed, retrying', { retryCount, delay, error: error?.message })
        await new Promise(resolve => setTimeout(resolve, delay))
        set({ retryCount: retryCount + 1 })
        return get().fetchStatus()
      }
      logger.warn('Subscription status fetch failed after retries', { error: error?.message })
      set({ error: error?.message || 'Failed to load subscription', loading: false, retryCount: 0 })
    }
  },

  refreshIfStale: async () => {
    const { lastFetchedAt, loading, subscription } = get()
    if (loading) return
    if (lastFetchedAt && Date.now() - lastFetchedAt < STALE_THRESHOLD_MS) return
    if (!subscription && !lastFetchedAt) {
      await get().fetchStatus()
      return
    }
    try {
      const response = await apiService.get('/subscriptions/mobile-status')
      const data = response?.data || response
      set({ subscription: normalizeSubscription(data), lastFetchedAt: Date.now(), retryCount: 0 })
    } catch {
      // Silently fail on stale refresh — keep existing cache
      set({ lastFetchedAt: Date.now() })
    }
  },

  startTrial: async () => {
    set({ loading: true, error: null })
    try {
      const response = await apiService.post('/subscriptions/start-trial', {})
      const data = response?.subscription || response?.data || response
      set({ subscription: normalizeSubscription(data), loading: false, lastFetchedAt: Date.now() })
      logger.capture('subscription_trial_started')
    } catch (error: any) {
      set({ error: error?.message || 'Failed to start trial', loading: false })
      throw error
    }
  },

  syncSubscription: async () => {
    try {
      await apiService.post('/subscriptions/sync', {})
      await get().fetchStatus()
    } catch (error: any) {
      logger.warn('Subscription sync failed', { error: error?.message })
    }
  },

  openBillingPortal: async () => {
    try {
      const supported = await Linking.canOpenURL(BILLING_PORTAL_URL)
      if (supported) {
        await Linking.openURL(BILLING_PORTAL_URL)
        logger.capture('billing_portal_opened')
      } else {
        Alert.alert('Unable to Open', 'Please visit getcollab.in/billing on your browser to manage your subscription.')
      }
    } catch (error: any) {
      logger.warn('Failed to open billing portal', { error: error?.message })
      Alert.alert('Unable to Open', 'Please visit getcollab.in/billing on your browser to manage your subscription.')
    }
  },

  reset: () => set({
    subscription: null,
    loading: false,
    error: null,
    lastFetchedAt: null,
    retryCount: 0,
  }),
}))

export function useSubscriptionBackgroundRefresh() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    const fetchStatus = useSubscriptionStore.getState().fetchStatus
    const refreshIfStale = useSubscriptionStore.getState().refreshIfStale

    fetchStatus()

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        refreshIfStale()
      }
      appStateRef.current = nextState
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    intervalRef.current = setInterval(() => {
      refreshIfStale()
    }, BACKGROUND_REFRESH_INTERVAL_MS)

    return () => {
      subscription.remove()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])
}

export const getTrialDaysRemaining = (subscription: Subscription | null | undefined): number | null => {
  if (!subscription?.trialEndsAt) return null
  if (subscription.status !== 'TRIALING') return null
  if (subscription.inGracePeriod) return null
  const end = new Date(subscription.trialEndsAt).getTime()
  const now = Date.now()
  if (isNaN(end)) return null
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return null
  return diffDays
}
