import { useEffect, useRef } from 'react'
import { useNavigation, useNavigationState } from '@react-navigation/native'
import { useAuthStore } from '@shared/stores/auth-store'
import { resolveOnboardingTarget } from '@shared/lib/onboarding-target'

export function useAuthRedirect() {
  const navigation = useNavigation<any>()
  const { user, isLoading, updateRole, fetchCurrentUser } = useAuthStore()
  const handledRef = useRef<string | null>(null)

  const activeRoute = useNavigationState((state) => {
    if (!state) return null
    const stackRoute = state.routes[state.index]
    if (stackRoute?.state) {
      const nested = stackRoute.state.routes[stackRoute.state.index as number]
      return nested?.name || stackRoute.name
    }
    return stackRoute?.name || null
  })

  useEffect(() => {
    if (isLoading || !user) return

    const target = resolveOnboardingTarget(user)
    const key = `${user.id}:${target.kind}:${target.kind === 'onboarding' ? target.step : ''}:${user.onboardingCompleted}`

    if (handledRef.current === key) return

    const run = async () => {
      if (target.kind === 'role-selection') {
        try {
          await updateRole('brand')
          await fetchCurrentUser()
        } catch {
          // Will retry when user state updates.
        }
        return
      }

      if (target.kind === 'onboarding') {
        if (activeRoute !== 'Onboarding') {
          navigation.navigate('Onboarding', { initialStep: target.step })
        }
        handledRef.current = key
        return
      }

      if (target.kind === 'dashboard' && activeRoute === 'Onboarding') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        })
      }

      handledRef.current = key
    }

    run()
  }, [user, isLoading, updateRole, fetchCurrentUser, navigation, activeRoute])
}
