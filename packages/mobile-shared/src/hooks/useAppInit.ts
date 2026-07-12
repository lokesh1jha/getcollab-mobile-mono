import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '../stores/auth-store'
import { useReferenceDataStore } from '../stores/reference-data-store'
import { initObservability } from '../services/observability'
import { notificationService } from '../services/notification-service'
import { logger } from '../services/logger'
import { isMaintenanceError } from '../utils/unwrap-api'

interface UseAppInitOptions {
  splashDelayMs?: number
}

export function useAppInit({ splashDelayMs = 1500 }: UseAppInitOptions = {}) {
  const [appReady, setAppReady] = useState(false)
  const [apiError, setApiError] = useState(false)
  const splashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchCurrentUser = useAuthStore((s) => s.fetchCurrentUser)

  const initializeApp = useCallback(async () => {
    setApiError(false)

    try {
      await initObservability()
    } catch (error: any) {
      logger.warn('Observability init failed', { error: error?.message })
    }

    // Public endpoint — non-blocking
    useReferenceDataStore.getState().fetch().catch(() => {})

    try {
      await fetchCurrentUser()
      const currentUser = useAuthStore.getState().user
      if (currentUser?.id) {
        logger.identify(currentUser.id, { role: currentUser.role, email: currentUser.email })
        await notificationService.initialize()
      }
    } catch (error: any) {
      if (isMaintenanceError(error?.message)) {
        logger.error('API maintenance during initialization', error)
        setApiError(true)
      } else {
        // Auth/network failures are normal when logged out — show login screen
        logger.warn('App init partial failure', { error: error?.message })
      }
    } finally {
      if (splashTimeoutRef.current) clearTimeout(splashTimeoutRef.current)
      splashTimeoutRef.current = setTimeout(() => setAppReady(true), splashDelayMs)
    }
  }, [fetchCurrentUser, splashDelayMs])

  useEffect(() => {
    initializeApp()
    return () => {
      if (splashTimeoutRef.current) clearTimeout(splashTimeoutRef.current)
    }
  }, [initializeApp])

  return { appReady, apiError, initializeApp }
}
