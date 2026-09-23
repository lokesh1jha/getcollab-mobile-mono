import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../stores/auth-store'
import { useReferenceDataStore } from '../stores/reference-data-store'
import { initObservability } from '../services/observability'
import { logger } from '../services/logger'
import { isMaintenanceError } from '../utils/unwrap-api'

export function useAppInit() {
  const [appReady, setAppReady] = useState(false)
  const [apiError, setApiError] = useState(false)
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
    } catch (error: any) {
      if (isMaintenanceError(error?.message)) {
        logger.error('API maintenance during initialization', error)
        setApiError(true)
      } else {
        // Auth/network failures are normal when logged out — show login screen
        logger.warn('App init partial failure', { error: error?.message })
      }
    } finally {
      // Ready as soon as auth resolves — no artificial splash hold.
      setAppReady(true)
    }
  }, [fetchCurrentUser])

  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  return { appReady, apiError, initializeApp }
}
