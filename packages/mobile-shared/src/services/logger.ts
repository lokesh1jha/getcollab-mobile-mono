type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface RemoteLogger {
  capture: (level: LogLevel, message: string, context?: Record<string, any>) => void
  identify?: (userId: string | null, traits?: Record<string, any>) => void
}

let sentryAdapter: RemoteLogger | null = null

export function registerSentryAdapter(adapter: RemoteLogger | null) {
  sentryAdapter = adapter
}

function fanOut(level: LogLevel, message: string, context?: Record<string, any>) {
  try {
    sentryAdapter?.capture(level, message, context)
  } catch (err) {
    if (__DEV__) console.warn('Sentry capture failed:', err)
  }
}

export const logger = {
  debug(message: string, context?: Record<string, any>) {
    if (__DEV__) console.debug(`[debug] ${message}`, context ?? '')
    fanOut('debug', message, context)
  },
  info(message: string, context?: Record<string, any>) {
    if (__DEV__) console.info(`[info] ${message}`, context ?? '')
    fanOut('info', message, context)
  },
  warn(message: string, context?: Record<string, any>) {
    if (__DEV__) console.warn(`[warn] ${message}`, context ?? '')
    fanOut('warn', message, context)
  },
  error(message: string, error?: any, context?: Record<string, any>) {
    if (__DEV__) console.error(`[error] ${message}`, error ?? '', context ?? '')
    fanOut('error', message, {
      ...context,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
    })
  },
  /** Pass null on sign-out to detach the user. Never send PII in traits. */
  identify(userId: string | null, traits?: Record<string, any>) {
    try {
      sentryAdapter?.identify?.(userId, traits)
    } catch (err) {
      if (__DEV__) console.warn('Sentry identify failed:', err)
    }
  },
  capture(event: string, properties?: Record<string, any>) {
    if (__DEV__) console.log(`[track] ${event}`, properties ?? '')
    fanOut('info', event, properties)
  },
}

export default logger
