
import {
  allDeliverablesApproved,
  deliverableProgress,
  type DealMilestone,
  type DealSubmission,
} from '@shared/lib/deal-deliverables'

const reel: DealMilestone = {
  id: "m1",
  title: "Reel 1",
  kind: "deliverable",
  status: "pending",
  sort_order: 0,
  requires_script: true,
  requires_content: true,
  requires_live_link: true,
}

function sub(over: Partial<DealSubmission>): DealSubmission {
  return {
    id: Math.random().toString(36).slice(2),
    deal_id: "d1",
    milestone_id: "m1",
    kind: "SCRIPT",
    version: 1,
    blob_ids: [],
    status: "submitted",
    auto_approved: false,
    submitted_at: "2026-09-23T10:00:00Z",
    ...over,
  }
}

describe("deliverableProgress", () => {
  it("A new deliverable opens its first stage and locks the rest", () => {
    const [p] = deliverableProgress([reel], [])
    expect(p.stages.map((s) => s.state)).toEqual(["open", "locked", "locked"])
    expect(p.current?.kind).toBe("SCRIPT")
    expect(p.done).toBe(false)
  })

  it("An approved script unlocks content", () => {
    const [p] = deliverableProgress([reel], [sub({ status: "approved" })])
    expect(p.stages.map((s) => s.state)).toEqual(["approved", "open", "locked"])
    expect(p.current?.kind).toBe("CONTENT")
  })

  it("The newest version decides the stage and history is newest first", () => {
    const [p] = deliverableProgress([reel], [
      sub({ status: "approved" }),
      sub({ kind: "CONTENT", version: 1, status: "changes_requested", review_note: "brighter" }),
      sub({ kind: "CONTENT", version: 2, status: "submitted" }),
    ])
    const content = p.stages[1]
    expect(content.state).toBe("submitted")
    expect(content.history.map((s) => s.version)).toEqual([2, 1])
  })

  it("Stages the deliverable does not have are left out", () => {
    const [p] = deliverableProgress(
      [{ ...reel, requires_script: false }],
      [sub({ kind: "CONTENT", status: "approved" })],
    )
    expect(p.stages.map((s) => s.kind)).toEqual(["CONTENT", "LIVE_LINK"])
    expect(p.current?.kind).toBe("LIVE_LINK")
  })

  it("A rejected stage ends the deliverable with no next action", () => {
    const [p] = deliverableProgress([reel], [sub({ status: "rejected" })])
    expect(p.rejected).toBe(true)
    expect(p.current).toBeUndefined()
  })

  it("Only deliverable milestones count, in sort order", () => {
    const out = deliverableProgress(
      [
        { ...reel, id: "m2", title: "Reel 2", sort_order: 1 },
        { ...reel, id: "pay", title: "Payment", kind: "payment", sort_order: 2 },
        reel,
      ],
      [],
    )
    expect(out.map((p) => p.milestone.title)).toEqual(["Reel 1", "Reel 2"])
  })
})

describe("allDeliverablesApproved", () => {
  const done = ["SCRIPT", "CONTENT", "LIVE_LINK"].map((kind) =>
    sub({ kind: kind as DealSubmission["kind"], status: "approved" }),
  )

  it("Release waits for every deliverable", () => {
    const second = { ...reel, id: "m2", title: "Reel 2", sort_order: 1 }
    expect(allDeliverablesApproved(deliverableProgress([reel, second], done))).toBe(false)
    const secondDone = done.map((s) => ({ ...s, id: s.id + "b", milestone_id: "m2" }))
    expect(allDeliverablesApproved(deliverableProgress([reel, second], [...done, ...secondDone]))).toBe(true)
  })

  it("A deal with no deliverables is not releasable", () => {
    expect(allDeliverablesApproved([])).toBe(false)
  })
})
