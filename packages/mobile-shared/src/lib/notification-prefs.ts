/**
 * The apps show notification toggles by category ("campaign updates", "bid
 * alerts"); getcollab-go stores preferences per event type and channel
 * (GET/PUT /v1/notifications/preferences). This maps one onto the other.
 * A missing preference row means every channel is on.
 */

export type PrefRow = {
  event_type: string
  in_app: boolean
  email: boolean
  web_push: boolean
  mobile_push: boolean
}

export type Channel = 'email' | 'mobile_push' | 'all'

/** Event types each category covers (the deal-event matrix in getcollab-go). */
export const NOTIFICATION_CATEGORIES: Record<string, string[]> = {
  campaign: [
    'campaign.published', 'campaign.private', 'campaign.deleted',
    'invite.created', 'invite.declined', 'invite.expired',
    'deal.created', 'contract.signed', 'deal.funded', 'deal.started',
    'submission.submitted', 'submission.approved', 'submission.changes_requested', 'submission.rejected',
    'deliverable.completed', 'deliverable.due_soon', 'deliverable.overdue',
    'deal.deliverables_complete', 'deal.status_changed', 'deal.review_window_closing',
  ],
  bids: ['bid.created', 'bid.withdrawn', 'offer.initial', 'offer.counter', 'offer.accept', 'offer.reject'],
  messages: ['message.received'],
  payments: [
    'deal.payment_released', 'deal.completed', 'deal.refunded',
    'deal.performance_met', 'deal.performance_missed', 'deal.performance_no_data',
  ],
}

/** Each legacy toggle key the apps use: which categories and which channel. */
export const LEGACY_TOGGLES: Record<string, { categories: string[]; channel: Channel }> = {
  // brand app
  emailCampaignUpdates: { categories: ['campaign'], channel: 'email' },
  emailBidAlerts: { categories: ['bids'], channel: 'email' },
  emailMessageAlerts: { categories: ['messages'], channel: 'email' },
  pushCampaignUpdates: { categories: ['campaign'], channel: 'mobile_push' },
  pushBidAlerts: { categories: ['bids'], channel: 'mobile_push' },
  pushMessageAlerts: { categories: ['messages'], channel: 'mobile_push' },
  // influencer app
  emailNotifications: { categories: Object.keys(NOTIFICATION_CATEGORIES), channel: 'email' },
  pushNotifications: { categories: Object.keys(NOTIFICATION_CATEGORIES), channel: 'mobile_push' },
  campaignUpdates: { categories: ['campaign', 'bids'], channel: 'all' },
  messageNotifications: { categories: ['messages'], channel: 'all' },
  paymentNotifications: { categories: ['payments'], channel: 'all' },
}

function eventsFor(key: string): string[] {
  const t = LEGACY_TOGGLES[key]
  return t ? t.categories.flatMap((c) => NOTIFICATION_CATEGORIES[c] ?? []) : []
}

function rowFor(rows: PrefRow[], eventType: string): PrefRow {
  return rows.find((r) => r.event_type === eventType) ?? {
    event_type: eventType, in_app: true, email: true, web_push: true, mobile_push: true,
  }
}

function channelOn(row: PrefRow, channel: Channel): boolean {
  if (channel === 'all') return row.in_app || row.email || row.mobile_push
  return row[channel]
}

/** The toggle is on when its channel is on for every event it covers. */
export function toggleState(rows: PrefRow[], key: string): boolean {
  const events = eventsFor(key)
  return events.length > 0 && events.every((e) => channelOn(rowFor(rows, e), LEGACY_TOGGLES[key].channel))
}

/** Every legacy toggle's state, in the shape the settings screens read. */
export function toggleStates(rows: PrefRow[]): Record<string, boolean> {
  return Object.fromEntries(Object.keys(LEGACY_TOGGLES).map((k) => [k, toggleState(rows, k)]))
}

/** The preference rows to PUT so the toggle takes the value, other channels kept. */
export function rowsForToggle(rows: PrefRow[], key: string, value: boolean): PrefRow[] {
  const t = LEGACY_TOGGLES[key]
  if (!t) return []
  return eventsFor(key).map((e) => {
    const r = { ...rowFor(rows, e) }
    if (t.channel === 'all') {
      r.in_app = value
      r.email = value
      r.mobile_push = value
      r.web_push = value
    } else {
      r[t.channel] = value
    }
    return r
  })
}
