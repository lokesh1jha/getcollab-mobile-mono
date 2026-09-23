import { apiBaseUrlFromEnv } from '@shared/utils/api-url'

describe('apiBaseUrlFromEnv', () => {
  const dev = (global as any).__DEV__
  afterEach(() => { (global as any).__DEV__ = dev })

  it('uses the configured URL', () => {
    expect(apiBaseUrlFromEnv('https://api.getcollab.in/api/v1')).toBe('https://api.getcollab.in/api/v1')
  })

  it('falls back to the local API in dev', () => {
    ;(global as any).__DEV__ = true
    expect(apiBaseUrlFromEnv(undefined)).toContain(':4000/api/v1')
  })

  // A release build without EXPO_PUBLIC_API_URL used to ship pointing at localhost.
  it('throws in a release build when unset', () => {
    ;(global as any).__DEV__ = false
    expect(() => apiBaseUrlFromEnv(undefined)).toThrow('EXPO_PUBLIC_API_URL')
  })
})
