/** Normalize API responses that may be wrapped in { data }, { user }, etc. */

export function unwrapUser(response: unknown): Record<string, unknown> | null {
  if (!response || typeof response !== 'object') return null
  const r = response as Record<string, unknown>

  // 1. Extract user object
  let user: Record<string, any> | null = null
  if (r.user && typeof r.user === 'object') {
    user = { ...(r.user as Record<string, unknown>) }
  } else if (r.data && typeof r.data === 'object' && !Array.isArray(r.data)) {
    const data = r.data as Record<string, unknown>
    if (data.user && typeof data.user === 'object') {
      user = { ...(data.user as Record<string, unknown>) }
    } else {
      user = { ...data }
    }
  } else {
    user = { ...r }
  }

  // 2. Resolve id (either id or user_id)
  const resolvedId = user.id || user.user_id
  if (!resolvedId || typeof resolvedId !== 'string') {
    return null
  }

  // Normalize id key
  user.id = resolvedId

  // Normalize role
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    if (user.roles.includes('brand_admin') || user.roles.includes('brand')) {
      user.role = 'brand'
    } else if (user.roles.includes('influencer')) {
      user.role = 'influencer'
    } else {
      user.role = user.roles[0]
    }
  } else if (typeof user.role === 'string') {
    if (user.role === 'brand_admin') {
      user.role = 'brand'
    }
  }

  // Normalize emailVerified
  if (user.email_verified !== undefined) {
    user.emailVerified = user.email_verified
  }

  // Normalize onboarding completed / current step
  if (user.onboarding && typeof user.onboarding === 'object') {
    const onboarding = user.onboarding as Record<string, any>
    if (onboarding.complete !== undefined) {
      user.onboardingCompleted = onboarding.complete
    }
    if (onboarding.next !== undefined) {
      user.onboardingCurrentStep = onboarding.next
    }
  } else if (user.onboardingStatus) {
    user.onboardingCurrentStep = user.onboardingStatus
    user.onboardingCompleted = user.onboardingStatus === 'complete'
  }

  // Normalize termsAccepted
  if (user.terms_accepted !== undefined) {
    user.termsAcceptedAt = user.terms_accepted ? new Date().toISOString() : null
  }

  return user
}

export function unwrapEntity(response: unknown, entityKeys: string[] = ['data', 'campaign']): unknown {
  if (!response || typeof response !== 'object') return response
  const r = response as Record<string, unknown>
  if (r.id) return response
  for (const key of entityKeys) {
    const val = r[key]
    if (val && typeof val === 'object' && !Array.isArray(val) && 'id' in (val as object)) {
      return val
    }
  }
  return response
}

export function unwrapArray(
  response: unknown,
  keys: string[] = ['data', 'items', 'rooms', 'messages', 'campaigns', 'bids', 'notifications'],
): unknown[] {
  if (Array.isArray(response)) return response
  if (!response || typeof response !== 'object') return []
  const r = response as Record<string, unknown>
  for (const key of keys) {
    const val = r[key]
    if (Array.isArray(val)) return val
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const nested = val as Record<string, unknown>
      for (const nestedKey of ['messages', 'items', 'rooms', 'campaigns', 'bids']) {
        if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as unknown[]
      }
    }
  }
  return []
}

export function isMaintenanceError(message?: string): boolean {
  if (!message) return false
  return /maintenance|under maintenance/i.test(message)
}
