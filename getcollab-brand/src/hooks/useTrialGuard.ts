import { useEffect, useState, useCallback } from 'react'
import { useSubscriptionStore, getTrialDaysRemaining } from '../stores/subscription-store'
import type { SubscriptionStatus } from '@shared/types'

export interface TrialGuardResult {
  loading: boolean
  isBlocked: boolean
  isTrialing: boolean
  isActive: boolean
  isExpired: boolean
  isPastDue: boolean
  daysRemaining: number | null
  blockReason: string | null
  subscriptionStatus: SubscriptionStatus | null
  openBillingPortal: () => Promise<void>
  startTrial: () => Promise<void>
  refresh: () => Promise<void>
}

export function useTrialGuard(): TrialGuardResult {
  const { subscription, loading: storeLoading, fetchStatus, openBillingPortal, startTrial } = useSubscriptionStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!ready && !storeLoading) {
      fetchStatus().finally(() => setReady(true))
    }
  }, [fetchStatus, storeLoading, ready])

  const status = subscription?.status
  const daysRemaining = getTrialDaysRemaining(subscription)

  const isTrialing = status === 'TRIALING'
  const isActive = status === 'ACTIVE'
  const isPending = status === 'PENDING'
  const isExpired = status === 'EXPIRED' || status === 'CANCELLED' || status === 'NONE'
  const isPastDue = status === 'PAST_DUE'

  const hasAccess = isTrialing || isActive || isPending
  const isBlocked = !hasAccess && (status === 'EXPIRED' || status === 'CANCELLED' || status === 'PAST_DUE')

  let blockReason: string | null = null
  if (status === 'EXPIRED' || status === 'CANCELLED') {
    blockReason = 'Your workspace trial has ended. Continue collaborating by managing your subscription on the web dashboard.'
  } else if (status === 'PAST_DUE') {
    blockReason = 'Payment issue. Please update your billing information.'
  }

  const refresh = useCallback(async () => {
    await fetchStatus()
  }, [fetchStatus])

  return {
    loading: !ready,
    isBlocked,
    isTrialing,
    isActive,
    isExpired,
    isPastDue,
    daysRemaining,
    blockReason,
    subscriptionStatus: status ?? null,
    openBillingPortal,
    startTrial,
    refresh,
  }
}

export function useFeatureAccess(): {
  canCreateCampaign: boolean
  canUseAI: boolean
  canAccessPremiumAnalytics: boolean
  isBlocked: boolean
} {
  const subscription = useSubscriptionStore((s) => s.subscription)
  const status = subscription?.status
  const isTrialing = status === 'TRIALING'
  const isActive = status === 'ACTIVE'
  const hasAccess = isTrialing || isActive

  return {
    canCreateCampaign: hasAccess,
    canUseAI: hasAccess,
    canAccessPremiumAnalytics: hasAccess,
    isBlocked: !hasAccess,
  }
}
