import { registerSentryAdapter, registerPosthogAdapter } from './logger'

// Initialize Sentry + PostHog if their SDKs are present. We deliberately
// import lazily so the app still bundles when the SDKs aren't installed yet —
// the user can `npm i sentry-expo posthog-react-native` and set env vars to
// activate.
export async function initObservability() {
  await initSentry()
  await initPosthog()
}

async function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
  if (!dsn) {
    if (__DEV__) console.log('[observability] Sentry DSN not set, skipping')
    return
  }
  try {
    // @ts-ignore — sentry-expo is optional; absence is acceptable
    const Sentry = await import('sentry-expo').catch(() => null)
    if (!Sentry) {
      if (__DEV__) console.log('[observability] sentry-expo not installed')
      return
    }
    Sentry.init({
      dsn,
      enableInExpoDevelopment: false,
      debug: __DEV__,
      tracesSampleRate: 0.2,
    })
    registerSentryAdapter({
      capture: (level, message, context) => {
        const native = (Sentry as any).Native || Sentry
        if (level === 'error') {
          native.captureException(new Error(message), { extra: context })
        } else {
          native.captureMessage(message, { level, extra: context })
        }
      },
      identify: (userId, traits) => {
        const native = (Sentry as any).Native || Sentry
        native.setUser({ id: userId, ...traits })
      },
    })
  } catch (err) {
    if (__DEV__) console.warn('[observability] Sentry init failed:', err)
  }
}

async function initPosthog() {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
  if (!apiKey) {
    if (__DEV__) console.log('[observability] PostHog key not set, skipping')
    return
  }
  try {
    // @ts-ignore — posthog-react-native is optional
    const mod = await import('posthog-react-native').catch(() => null)
    if (!mod) {
      if (__DEV__) console.log('[observability] posthog-react-native not installed')
      return
    }
    const PostHog = (mod as any).default || (mod as any).PostHog
    const client = new PostHog(apiKey, { host })
    registerPosthogAdapter({
      capture: (level, message, context) => {
        client.capture(message, { level, ...context })
      },
      identify: (userId, traits) => {
        client.identify(userId, traits)
      },
    })
  } catch (err) {
    if (__DEV__) console.warn('[observability] PostHog init failed:', err)
  }
}
