import {
  resolveNotificationRoute,
  routeFromDeepLink,
  routeFromEventType,
} from '@shared/lib/notification-routes'

describe('routeFromDeepLink', () => {
  const cases: Array<[string, string, Record<string, unknown> | undefined]> = [
    // [deep link, expected screen, expected params]
    ['/dashboard', 'Dashboard', undefined],
    ['/chat?roomId=room-1', 'ChatDetail', { roomId: 'room-1', id: 'room-1' }],
    ['/chat', 'Chat', undefined],
    ['/dashboard/wallet', 'Wallet', undefined],
    ['/dashboard/invoices', 'Invoices', undefined],
    ['/dashboard/analytics', 'Analytics', undefined],
    ['/dashboard/growth/seo', 'Growth', undefined],
    ['/dashboard/invites', 'Invites', undefined],
    ['/dashboard/bids', 'Bids', undefined],
    ['/dashboard/disputes', 'Disputes', undefined],
    ['/dashboard/billing', 'Billing', undefined],
    ['/dashboard/relationships', 'Relationships', undefined],
    ['/dashboard/relationships/r1', 'RelationshipDetail', { id: 'r1' }],
    ['/dashboard/campaigns', 'Campaigns', undefined],
    ['/dashboard/campaigns/c1', 'CampaignDetails', { id: 'c1' }],
    ['/dashboard/campaigns/c1/escrow', 'CampaignEscrow', { id: 'c1' }],
    ['/dashboard/campaigns/c1/analytics', 'CampaignAnalytics', { id: 'c1' }],
    ['/dashboard/creators', 'Creators', undefined],
    ['/dashboard/creators/i1/report', 'CreatorReport', { id: 'i1' }],
    ['/dashboard/affiliate', 'Affiliate', undefined],
    ['/dashboard/affiliate/p1', 'AffiliateDetail', { id: 'p1' }],
    ['/dashboard/affiliate/p1/links', 'AffiliateLinks', { programId: 'p1' }],
    ['/dashboard/affiliate/p1/commissions', 'AffiliateCommissions', { programId: 'p1' }],
    ['/dashboard/settings', 'Settings', undefined],
    ['/dashboard/settings/security', 'Security', undefined],
    ['/dashboard/settings/notifications', 'NotificationSettings', undefined],
    ['/dashboard/settings/team', 'Team', undefined],
  ]

  it.each(cases)('maps %s to %s', (link, screen, params) => {
    expect(routeFromDeepLink(link)).toEqual({ screen, params })
  })

  it('handles absolute URLs as well as bare paths', () => {
    expect(routeFromDeepLink('https://app.getcollab.in/dashboard/wallet')).toEqual({ screen: 'Wallet' })
  })

  it('falls back to the dashboard for an unknown dashboard section', () => {
    expect(routeFromDeepLink('/dashboard/something-new')).toEqual({ screen: 'Dashboard' })
  })

  it('returns null for links this app cannot serve', () => {
    expect(routeFromDeepLink('')).toBeNull()
    expect(routeFromDeepLink('/pricing')).toBeNull()
    expect(routeFromDeepLink('https://blog.getcollab.in/post')).toBeNull()
  })
})

describe('routeFromEventType', () => {
  it('routes a chat message to its room', () => {
    expect(routeFromEventType({ eventType: 'message.received', roomId: 'room-1' })).toEqual({
      screen: 'ChatDetail',
      params: { roomId: 'room-1', id: 'room-1', chat: undefined },
    })
  })

  it('routes campaign lifecycle events to the campaign', () => {
    expect(routeFromEventType({ eventType: 'campaign.published', campaignId: 'c1' })).toEqual({
      screen: 'CampaignDetails',
      params: { id: 'c1' },
    })
  })

  it('falls back to the campaign list when the id is missing', () => {
    expect(routeFromEventType({ eventType: 'campaign.deleted' })).toEqual({ screen: 'Campaigns' })
  })

  it.each([
    ['bid.received', 'Bids'],
    ['invite.sent', 'Invites'],
    ['relationship.created', 'Relationships'],
    ['payout.released', 'Wallet'],
    ['wallet.topped_up', 'Wallet'],
    ['invoice.paid', 'Invoices'],
    ['subscription.renewed', 'Billing'],
    ['dispute.opened', 'Disputes'],
    ['affiliate.commission', 'Affiliate'],
    ['growth.report_ready', 'Growth'],
    ['analytics.weekly', 'Analytics'],
    ['settings.changed', 'Settings'],
  ])('routes %s to %s', (eventType, screen) => {
    expect(routeFromEventType({ eventType })).toEqual({ screen, params: undefined })
  })

  it('routes a creator event to the report when the creator id is known', () => {
    expect(routeFromEventType({ eventType: 'creator.joined', influencerId: 'i1' })).toEqual({
      screen: 'CreatorReport',
      params: { id: 'i1' },
    })
  })

  it('still understands the legacy push `type` + id shape', () => {
    expect(routeFromEventType({ type: 'chat', roomId: 'room-9' })).toEqual({
      screen: 'ChatDetail',
      params: { roomId: 'room-9', id: 'room-9', chat: undefined },
    })
    expect(routeFromEventType({ type: 'campaign', campaignId: 'c9' })).toEqual({
      screen: 'CampaignDetails',
      params: { id: 'c9' },
    })
    expect(routeFromEventType({ type: 'bid', bidId: 'b9' })).toEqual({
      screen: 'Bids',
      params: { bidId: 'b9' },
    })
    expect(routeFromEventType({ type: 'subscription' })).toEqual({ screen: 'Billing' })
  })

  it('returns null when there is nothing to route on', () => {
    expect(routeFromEventType({})).toBeNull()
    expect(routeFromEventType({ eventType: 'weather.rainy' })).toBeNull()
  })
})

describe('resolveNotificationRoute', () => {
  it('prefers the deep link over the event type', () => {
    expect(
      resolveNotificationRoute({ deepLink: '/dashboard/wallet', eventType: 'campaign.published', campaignId: 'c1' }),
    ).toEqual({ screen: 'Wallet' })
  })

  it('accepts either deep-link spelling', () => {
    expect(resolveNotificationRoute({ deep_link: '/dashboard/invites' })).toEqual({ screen: 'Invites' })
    expect(resolveNotificationRoute({ deepLink: '/dashboard/invites' })).toEqual({ screen: 'Invites' })
  })

  it('falls back to the event type when the link is unusable', () => {
    expect(
      resolveNotificationRoute({ deepLink: '/pricing', eventType: 'payout.released' }),
    ).toEqual({ screen: 'Wallet' })
  })

  it('returns null for empty payloads', () => {
    expect(resolveNotificationRoute(null)).toBeNull()
    expect(resolveNotificationRoute(undefined)).toBeNull()
    expect(resolveNotificationRoute({})).toBeNull()
  })
})
