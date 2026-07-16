/** Normalize API responses that may be wrapped in { data }, { user }, etc. */

export function unwrapUser(response: unknown): Record<string, unknown> | null {
  if (!response || typeof response !== 'object') return null
  const r = response as Record<string, unknown>
  const user =
    r.user ??
    (r.data as Record<string, unknown> | undefined)?.user ??
    (typeof r.data === 'object' && r.data && !Array.isArray(r.data) ? r.data : null) ??
    (r.id ? r : null)
  if (!user || typeof user !== 'object' || !('id' in user)) return null
  return user as Record<string, unknown>
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
