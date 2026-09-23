import { NOTIFICATION_CATEGORIES, rowsForToggle, toggleState, type PrefRow } from '@shared/lib/notification-prefs'

describe('notification preference mapping', () => {
  it('With no saved rows every toggle is on (the backend default)', () => {
    expect(toggleState([], 'emailBidAlerts')).toBe(true)
    expect(toggleState([], 'pushMessageAlerts')).toBe(true)
  })

  it('Turning off bid emails writes one row per bid event and keeps push on', () => {
    const rows = rowsForToggle([], 'emailBidAlerts', false)
    expect(rows.map((r) => r.event_type)).toEqual(NOTIFICATION_CATEGORIES.bids)
    expect(rows.every((r) => r.email === false && r.mobile_push === true && r.in_app === true)).toBe(true)
    expect(toggleState(rows, 'emailBidAlerts')).toBe(false)
    expect(toggleState(rows, 'pushBidAlerts')).toBe(true)
  })

  it('A category is on only when every event in it is on', () => {
    const one: PrefRow = { event_type: 'offer.counter', in_app: true, email: false, web_push: true, mobile_push: true }
    expect(toggleState([one], 'emailBidAlerts')).toBe(false)
  })

  it('An all-channel toggle switches every channel', () => {
    const rows = rowsForToggle([], 'messageNotifications', false)
    expect(rows).toEqual([{ event_type: 'message.received', in_app: false, email: false, web_push: false, mobile_push: false }])
  })

  it('An unknown toggle writes nothing', () => {
    expect(rowsForToggle([], 'emailWeeklyDigest', false)).toEqual([])
    expect(toggleState([], 'emailWeeklyDigest')).toBe(false)
  })
})
