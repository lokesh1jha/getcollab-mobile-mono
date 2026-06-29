export interface AuthUserSnapshot {
  id?: string
  role?: string | null
  onboardingCompleted?: boolean
  onboardingCurrentStep?: string | null
  termsAcceptedAt?: string | Date | null
}

export type OnboardingRedirectTarget =
  | { kind: 'signin' }
  | { kind: 'role-selection' }
  | { kind: 'onboarding'; step: number }
  | { kind: 'dashboard' }

const BRAND_STEP_PATHS: Record<number, string> = {
  1: '/auth/onboarding/brand',
  2: '/auth/onboarding/brand/step-2-campaigns',
  3: '/auth/onboarding/brand/step-3-scale',
}

export function onboardingPathToStep(path: string | null | undefined, role: string): number {
  if (!path) return 1
  if (role === 'brand') {
    if (path.includes('step-3-scale') || path.includes('/scale')) return 3
    if (path.includes('step-2-campaigns') || path.includes('/campaigns')) return 2
    return 1
  }
  if (path.includes('step-3-socials') || path.includes('/socials')) return 2
  return 1
}

export function resolveOnboardingTarget(user: AuthUserSnapshot | null): OnboardingRedirectTarget {
  if (!user?.id) return { kind: 'signin' }
  if (!user.role || user.role === 'pending') return { kind: 'role-selection' }
  if (!user.onboardingCompleted) {
    return {
      kind: 'onboarding',
      step: onboardingPathToStep(user.onboardingCurrentStep, user.role),
    }
  }
  return { kind: 'dashboard' }
}

export function brandOnboardingStepPath(step: number): string {
  return BRAND_STEP_PATHS[step] || BRAND_STEP_PATHS[1]
}
