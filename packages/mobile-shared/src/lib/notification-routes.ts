/**
 * Notification → mobile route resolution.
 *
 * The backend persists a `deep_link` for every notification (a web path such as
 * `/dashboard/wallet`) and push payloads carry it alongside the event type. Both
 * the push tap handler and the in-app notification list resolve through this one
 * pure function so the two surfaces cannot drift apart.
 */

export interface NotificationRoute {
  screen: string
  params?: Record<string, unknown>
}

/** Superset of the fields the backend and push payloads may carry. */
export interface NotificationPayload {
  deep_link?: string
  deepLink?: string
  url?: string
  type?: string
  eventType?: string
  event_type?: string
  entityType?: string
  entity_type?: string
  roomId?: string
  room_id?: string
  campaignId?: string
  campaign_id?: string
  bidId?: string
  bid_id?: string
  dealId?: string
  deal_id?: string
  relationshipId?: string
  relationship_id?: string
  influencerId?: string
  influencer_id?: string
  programId?: string
  program_id?: string
  chat?: unknown
}

/** Campaign workspace sub-pages, keyed by their web path segment. */
const CAMPAIGN_TABS: Record<string, string> = {
  edit: 'CampaignEdit',
  discover: 'CampaignDiscover',
  responses: 'CampaignResponses',
  execute: 'CampaignExecute',
  outreach: 'CampaignOutreach',
  escrow: 'CampaignEscrow',
  circle: 'CampaignCircle',
  analytics: 'CampaignAnalytics',
}

/** Settings sub-pages, keyed by their web path segment. */
const SETTINGS_SECTIONS: Record<string, string> = {
  profile: 'Profile',
  account: 'Account',
  security: 'Security',
  notifications: 'NotificationSettings',
  team: 'Team',
  billing: 'Billing',
}

function first(...values: Array<string | undefined>): string | undefined {
  return values.find((v) => typeof v === 'string' && v.length > 0)
}

/** Split `/a/b?x=1#frag` (or an absolute URL) into path segments plus its query. */
function parseLink(link: string): { segments: string[]; query: URLSearchParams } {
  // Payloads may carry a path (`/dashboard/wallet`) or a full URL — drop any
  // scheme and host so both resolve the same way.
  const withoutHost = link.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '')
  const [pathPart, rest = ''] = withoutHost.split('?')
  const [queryPart] = rest.split('#')
  const path = pathPart.replace(/^\/+|\/+$/g, '')
  return {
    segments: path ? path.split('/') : [],
    query: new URLSearchParams(queryPart),
  }
}

/**
 * Map a web deep link onto a mobile route. Returns null for anything that is not
 * a link this app can serve, so callers can fall back to the event type.
 */
export function routeFromDeepLink(link: string): NotificationRoute | null {
  const { segments, query } = parseLink(link)
  if (segments.length === 0) return null

  if (segments[0] === 'chat') {
    const roomId = first(query.get('roomId') ?? undefined, query.get('room_id') ?? undefined, segments[1])
    return roomId ? { screen: 'ChatDetail', params: { roomId, id: roomId } } : { screen: 'Chat' }
  }

  if (segments[0] !== 'dashboard') return null
  const rest = segments.slice(1)
  if (rest.length === 0) return { screen: 'Dashboard' }

  switch (rest[0]) {
    case 'wallet':
      return { screen: 'Wallet' }
    case 'invoices':
      return { screen: 'Invoices' }
    case 'analytics':
      return { screen: 'Analytics' }
    case 'growth':
      return { screen: 'Growth' }
    case 'invites':
      return { screen: 'Invites' }
    // Deal events link here (deals.event fan-out). Both apps register a
    // "Collaborations" route that opens the deal when given its id.
    case 'collaborations':
      return rest[1] ? { screen: 'Collaborations', params: { id: rest[1] } } : { screen: 'Collaborations' }
    case 'deal-invites':
      return { screen: 'DealInvites' }
    case 'applied':
      return { screen: 'MyCampaigns' }
    case 'bids':
      return { screen: 'Bids' }
    case 'disputes':
      return { screen: 'Disputes' }
    case 'subscription':
      return { screen: 'Subscription' }
    case 'billing':
      return { screen: 'Billing' }
    case 'relationships':
      return rest[1]
        ? { screen: 'RelationshipDetail', params: { id: rest[1] } }
        : { screen: 'Relationships' }
    case 'campaigns': {
      const id = rest[1]
      if (!id) return { screen: 'Campaigns' }
      const tab = rest[2]
      return { screen: (tab && CAMPAIGN_TABS[tab]) || 'CampaignDetails', params: { id } }
    }
    case 'creators': {
      const id = rest[1]
      if (!id) return { screen: 'Creators' }
      return rest[2] === 'report'
        ? { screen: 'CreatorReport', params: { id } }
        : { screen: 'Creators', params: { id } }
    }
    case 'affiliate': {
      const id = rest[1]
      if (!id) return { screen: 'Affiliate' }
      if (rest[2] === 'links') return { screen: 'AffiliateLinks', params: { programId: id } }
      if (rest[2] === 'commissions') return { screen: 'AffiliateCommissions', params: { programId: id } }
      return { screen: 'AffiliateDetail', params: { id } }
    }
    case 'settings': {
      const section = rest[1]
      return { screen: (section && SETTINGS_SECTIONS[section]) || 'Settings' }
    }
    default:
      return { screen: 'Dashboard' }
  }
}

/**
 * Fall back to the event type (`campaign.published`, `message.received`, …) for
 * payloads that carry no deep link. Routes to the most specific screen the
 * payload's ids allow, otherwise to the relevant list.
 */
export function routeFromEventType(payload: NotificationPayload): NotificationRoute | null {
  const type = first(payload.eventType, payload.event_type, payload.type)
  if (!type) return null
  const [domain] = type.toLowerCase().split('.')

  switch (domain) {
    case 'message':
    case 'chat': {
      const roomId = first(payload.roomId, payload.room_id)
      return roomId
        ? { screen: 'ChatDetail', params: { roomId, id: roomId, chat: payload.chat } }
        : { screen: 'Chat' }
    }
    case 'campaign': {
      const id = first(payload.campaignId, payload.campaign_id)
      return id ? { screen: 'CampaignDetails', params: { id } } : { screen: 'Campaigns' }
    }
    case 'bid':
      return { screen: 'Bids', params: payload.bidId || payload.bid_id ? { bidId: first(payload.bidId, payload.bid_id) } : undefined }
    case 'deal': {
      const id = first(payload.campaignId, payload.campaign_id)
      return id ? { screen: 'CampaignDetails', params: { id } } : { screen: 'Campaigns' }
    }
    case 'invite':
      return { screen: 'Invites' }
    case 'relationship': {
      const id = first(payload.relationshipId, payload.relationship_id)
      return id ? { screen: 'RelationshipDetail', params: { id } } : { screen: 'Relationships' }
    }
    case 'wallet':
    case 'payout':
    case 'payment':
    case 'escrow':
    case 'refund':
      return { screen: 'Wallet' }
    case 'invoice':
      return { screen: 'Invoices' }
    case 'subscription':
    case 'trial':
      return { screen: 'Billing' }
    case 'dispute':
      return { screen: 'Disputes' }
    case 'affiliate':
      return { screen: 'Affiliate' }
    case 'creator':
    case 'influencer': {
      const id = first(payload.influencerId, payload.influencer_id)
      return id ? { screen: 'CreatorReport', params: { id } } : { screen: 'Creators' }
    }
    case 'growth':
    case 'seo':
      return { screen: 'Growth' }
    case 'analytics':
      return { screen: 'Analytics' }
    case 'settings':
    case 'account':
    case 'security':
      return { screen: 'Settings' }
    default:
      return null
  }
}

/**
 * Resolve a notification payload to a route: an explicit deep link wins, and the
 * event type is the fallback. Null means "not routable" — the caller should leave
 * the user where they are rather than dumping them on the dashboard.
 */
export function resolveNotificationRoute(
  payload: NotificationPayload | null | undefined,
): NotificationRoute | null {
  if (!payload) return null
  const link = first(payload.deep_link, payload.deepLink, payload.url)
  return (link ? routeFromDeepLink(link) : null) ?? routeFromEventType(payload)
}
