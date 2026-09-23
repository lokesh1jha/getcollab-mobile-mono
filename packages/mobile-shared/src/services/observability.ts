import * as Sentry from '@sentry/react-native'
import { registerSentryAdapter } from './logger'

// Sentry.init also installs the global JS error and unhandled-rejection
// handlers, so crashes outside the ErrorBoundary are reported too.
export async function initObservability() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
  if (!dsn) {
    if (__DEV__) console.log('[observability] Sentry DSN not set, skipping')
    return
  }
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV || (__DEV__ ? 'development' : 'production'),
    debug: false,
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
  })
  registerSentryAdapter({
    capture: (level, message, context) => {
      if (level === 'debug') return
      const err = context?.error
      if (level === 'error') {
        Sentry.captureException(err?.stack ? Object.assign(new Error(err.message), err) : new Error(message), {
          extra: { message, ...context },
        })
      } else {
        Sentry.captureMessage(message, { level: level === 'warn' ? 'warning' : 'info', extra: context })
      }
    },
    identify: (userId, traits) => {
      Sentry.setUser(userId ? { id: userId, ...traits } : null)
    },
  })
}
