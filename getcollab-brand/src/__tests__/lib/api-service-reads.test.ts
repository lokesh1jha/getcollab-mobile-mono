import { apiService } from '@shared/services/api'

// Exercise the real ApiService methods; only the HTTP layer is stubbed.
const request = jest.spyOn(apiService as any, 'request')

afterEach(() => request.mockReset())

describe('getAllDeals', () => {
  it('follows cursors past the first page and keeps only the requested campaign', async () => {
    request
      .mockResolvedValueOnce({ deals: [{ id: 'd1', campaign_id: 'c1' }, { id: 'd2', campaign_id: 'other' }], pagination: { hasNext: true, nextCursor: 'CUR1' } })
      .mockResolvedValueOnce({ deals: [{ id: 'd3', campaign_id: 'c1' }], pagination: { hasNext: false, nextCursor: null } })

    const deals = await apiService.getAllDeals({ campaignId: 'c1' })

    expect(deals.map((d) => d.id)).toEqual(['d1', 'd3'])
    expect(request).toHaveBeenNthCalledWith(1, '/collabs?limit=100')
    expect(request).toHaveBeenNthCalledWith(2, '/collabs?limit=100&cursor=CUR1')
  })
})

describe('getSettings / updateAccount', () => {
  const ME = { name: 'Dana', email: 'dana@acme.test', phoneNumbers: ['+911234'], memberships: [{ org_id: 'o1' }] }

  it('reports unreadable preferences as null instead of all-on defaults', async () => {
    request.mockImplementation(async (path: string) => {
      if (path === '/auth/me') return ME
      if (path === '/profile') return { profile: { website: 'https://acme.test', industries: ['Beauty'] } }
      throw new Error('preferences down')
    })
    const s = await apiService.getSettings()
    expect(s.notifications).toBeNull()
    expect(s.websiteUrl).toBe('https://acme.test')
  })

  it('refuses to save a brand account when the profile read failed, rather than blanking website and industry', async () => {
    request.mockImplementation(async (path: string) => {
      if (path === '/auth/me') return ME
      if (path === '/profile') throw new Error('profile down')
      if (path === '/notifications/preferences') return { preferences: [] }
      throw new Error(`unexpected ${path}`)
    })
    await expect(apiService.updateAccount({ name: 'Dana K' })).rejects.toThrow("Couldn't load your current profile")
    expect(request).not.toHaveBeenCalledWith('/auth/account', expect.anything())
  })

  it('unwraps a nested /auth/me so unedited fields are sent back, not cleared', async () => {
    request.mockImplementation(async (path: string) => {
      if (path === '/auth/me') return { user: ME }
      if (path === '/profile') return { profile: { website: 'https://acme.test', industries: ['Beauty'] } }
      if (path === '/notifications/preferences') return { preferences: [] }
      return {}
    })
    await apiService.updateAccount({ name: 'Dana K' })
    const [, init] = request.mock.calls.find(([p]) => p === '/auth/account') as [string, { body: string }]
    expect(JSON.parse(init.body)).toEqual({ name: 'Dana K', phoneNumbers: ['+911234'], websiteUrl: 'https://acme.test', industry: 'Beauty' })
  })
})
