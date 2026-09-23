/**
 * Per-deliverable progress, derived from the deal's milestones and its
 * append-only submission history (getcollab-go deals.submission).
 *
 * A deliverable passes its required stages in order — script, then content,
 * then the live post link — and each stage's history is the list of versions
 * handed in for it. The server enforces the order; this only tells the UI what
 * to show and which action is next.
 */

export type SubmissionKind = "SCRIPT" | "CONTENT" | "LIVE_LINK"

export type SubmissionStatus = "submitted" | "approved" | "changes_requested" | "rejected" | "superseded"

export type DealSubmission = {
  id: string
  deal_id: string
  milestone_id: string
  kind: SubmissionKind
  version: number
  body_text?: string
  blob_ids: string[]
  caption?: string
  live_url?: string
  link_verified?: boolean
  status: SubmissionStatus
  review_note?: string
  auto_approved: boolean
  submitted_at: string
  reviewed_at?: string
}

export type DealMilestone = {
  id: string
  title: string
  kind: string
  status: string
  sort_order: number
  due_at?: string
  deliverable_type?: string
  requires_script?: boolean
  requires_content?: boolean
  requires_live_link?: boolean
  revision_count?: number
}

/** Where one stage of one deliverable stands. */
export type StageState =
  | "locked" // an earlier stage is not approved yet
  | "open" // ready for the creator to hand in
  | "submitted" // awaiting the brand
  | "changes_requested" // back with the creator
  | "approved"
  | "rejected"

export type StageProgress = {
  kind: SubmissionKind
  state: StageState
  /** The newest version, if any was handed in. */
  latest?: DealSubmission
  /** Every version of this stage, newest first. */
  history: DealSubmission[]
}

export type DeliverableProgress = {
  milestone: DealMilestone
  stages: StageProgress[]
  /** The stage that needs someone's action, if any. */
  current?: StageProgress
  done: boolean
  rejected: boolean
}

const ORDER: SubmissionKind[] = ["SCRIPT", "CONTENT", "LIVE_LINK"]

function requires(m: DealMilestone, kind: SubmissionKind): boolean {
  if (kind === "SCRIPT") return !!m.requires_script
  if (kind === "LIVE_LINK") return !!m.requires_live_link
  // Deliverables created before per-stage flags default to content.
  return m.requires_content ?? true
}

function stateOf(latest: DealSubmission | undefined, previousApproved: boolean): StageState {
  if (!previousApproved) return "locked"
  if (!latest) return "open"
  switch (latest.status) {
    case "approved":
      return "approved"
    case "rejected":
      return "rejected"
    case "changes_requested":
      return "changes_requested"
    case "submitted":
      return "submitted"
    default:
      return "open"
  }
}

export function deliverableProgress(
  milestones: DealMilestone[],
  submissions: DealSubmission[],
): DeliverableProgress[] {
  return milestones
    .filter((m) => m.kind === "deliverable")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => {
      const mine = submissions.filter((s) => s.milestone_id === m.id)
      let previousApproved = true
      const stages: StageProgress[] = []
      for (const kind of ORDER) {
        if (!requires(m, kind)) continue
        const history = mine
          .filter((s) => s.kind === kind)
          .sort((a, b) => b.version - a.version)
        const state = stateOf(history[0], previousApproved)
        stages.push({ kind, state, latest: history[0], history })
        previousApproved = state === "approved"
      }
      const rejected = stages.some((s) => s.state === "rejected")
      const done = stages.length > 0 && stages.every((s) => s.state === "approved")
      const current = rejected || done ? undefined : stages.find((s) => s.state !== "approved")
      return { milestone: m, stages, current, done, rejected }
    })
}

/** True once every deliverable is approved: the brand may release payment. */
export function allDeliverablesApproved(progress: DeliverableProgress[]): boolean {
  return progress.length > 0 && progress.every((p) => p.done)
}

export const STAGE_LABEL: Record<SubmissionKind, string> = {
  SCRIPT: "Script",
  CONTENT: "Content",
  LIVE_LINK: "Live post",
}
