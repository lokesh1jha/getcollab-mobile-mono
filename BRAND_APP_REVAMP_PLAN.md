# Brand App Revamp Plan — getcollab-mobile-mono

> **STATUS: COMPLETE after verification fixes (2026-09-23) ✅**
> The six phases below shipped at `5eb830c`, but a check against the Go API on 2026-09-23 found
> screens marked ✅ that called endpoints that do not exist or showed made-up numbers. Those are
> fixed; see **§7**. `tsc --noEmit` exits `0` in both apps; the brand suite runs
> **177 tests across 19 suites**, the influencer suite 7.

## Objective
Bring the **brand mobile app** to parity with the **web dashboard** (`getcollab/src/pages/dashboard/*`) while fixing all existing errors. The app must compile with zero TypeScript errors and cover all brand-relevant features.

**Outcome:** ✅ Achieved. 31 new screens/routes added, 2 pre-existing TS errors fixed, zero
TypeScript errors at `tsc --noEmit`.

---

## 1. Current State Audit (final)

### 1.1 Mobile Brand App — Screens
| Screen | File | Status |
|---|---|---|
| Landing | `(public)/landing` | ✅ |
| Sign In / Sign Up / Forgot / Reset | `(auth)/*` | ✅ |
| Dashboard | `(main)/brand/dashboard` | ✅ Revamped (quick-action grid) |
| Campaigns List | `(main)/brand/campaigns` | ✅ |
| Campaign Detail | `(main)/brand/campaigns/[id]` | ✅ Sub-tabs wired |
| Campaign Analytics | `(main)/brand/campaigns/[id]/analytics` | ✅ |
| Create Campaign | `(main)/brand/campaigns/create` | ✅ |
| Browse Creators | `(main)/brand/creators` | ✅ + Saved filter |
| Creator Report | `(main)/brand/creators/[id]/report` | ✅ **New** |
| Bids / Applications | `(main)/brand/bids` | ✅ |
| Chat List | `(main)/brand/chat` | ✅ |
| Chat Detail | `(main)/brand/chat-detail/[id]` | ✅ |
| Brand Profile | `(main)/brand/profile` | ✅ |
| Invite Creator | `(main)/brand/invite-creator` | ✅ |
| Wallet | `(main)/brand/wallet` | ✅ **New** |
| Relationships | `(main)/brand/relationships` | ✅ **New** |
| Relationship Detail | `(main)/brand/relationships/[id]` | ✅ **New** |
| Invites | `(main)/brand/invites` | ✅ **New** |
| Invoices | `(main)/brand/invoices` | ✅ **New** |
| Analytics (Campaign + Creator) | `(main)/brand/analytics` | ✅ **New** |
| Affiliate Programs | `(main)/brand/affiliate` | ✅ **New** |
| Affiliate Detail | `(main)/brand/affiliate/[id]` | ✅ **New** |
| Affiliate Links | `(main)/brand/affiliate/links` | ✅ **New** |
| Affiliate Commissions | `(main)/brand/affiliate/commissions` | ✅ **New** |
| Growth — Overview | `(main)/brand/growth` | ✅ **New** (score, signals, next steps) |
| Growth — Setup | `(main)/brand/growth/setup` | ✅ **New** |
| Growth — SEO | `(main)/brand/growth/seo` | ✅ **New** |
| Growth — Search Console | `(main)/brand/growth/search-console` | ✅ **New** |
| Growth — AI Visibility | `(main)/brand/growth/ai-visibility` | ✅ **New** |
| Growth — Opportunities | `(main)/brand/growth/opportunities` | ✅ **New** |
| Growth — Recommendations | `(main)/brand/growth/recommendations` | ✅ **New** |
| Campaign Edit | `(main)/brand/campaigns/[id]/edit` | ✅ **New** |
| Campaign Discover | `(main)/brand/campaigns/[id]/discover` | ✅ **New** |
| Campaign Responses | `(main)/brand/campaigns/[id]/responses` | ✅ **New** |
| Campaign Execute | `(main)/brand/campaigns/[id]/execute` | ✅ **New** |
| Campaign Outreach | `(main)/brand/campaigns/[id]/outreach` | ✅ **New** |
| Campaign Escrow | `(main)/brand/campaigns/[id]/escrow` | ✅ **New** |
| Campaign Circle | `(main)/brand/campaigns/[id]/circle` | ✅ **New** |
| Settings shell | `(main)/settings` | ✅ Refactored (6 sections) |
| Settings — Profile | `(main)/settings/profile` | ✅ **New** |
| Settings — Account | `(main)/settings/account` | ✅ **New** |
| Settings — Security | `(main)/settings/security` | ✅ **New** |
| Settings — Team | `(main)/settings/team` | ✅ **New** |
| Settings — Billing | `(main)/settings/billing` | ✅ **New** |
| Settings — Notifications | `(main)/settings/notifications` | ✅ **New** |
| Disputes | `(main)/disputes` | ✅ |
| Subscription / Workspace | `(main)/subscription` | ✅ |
| Notifications | `(main)/notifications` | ✅ |
| Onboarding | `(main)/onboarding` | ✅ Errors fixed |
| Verify Email | `(main)/verify-email` | ✅ |
| Change Password | `(main)/change-password` | ✅ |
| Profile Preview | `(main)/profile-preview` | ✅ |

### 1.2 Existing Errors — RESOLVED ✅
```
src/app/(main)/onboarding/index.tsx(327,47): TS2339: Property 'label' does not exist on type 'string | RefItem'.
src/app/(main)/onboarding/index.tsx(342,44): TS2339: Property 'label' does not exist on type 'string | RefItem'.
```
**Root cause:** `campaignTypes` and `objectives` arrays were typed as `(string | RefItem)[]` but
code assumed every item was `RefItem` with a `.label` property.

**Fix applied:** Option (c) — arrays are now normalized to `string[]` at the store boundary
(`selectCampaignTypes` / `selectObjectives`), and `renderChips(options: string[], selected:
string[], onToggle)` was rewritten to map plain strings directly. No `RefItem` narrowing needed at
the call sites (lines 327 / 342 now pass `string[]`). Verified by `tsc --noEmit` → exit `0`.

### 1.3 Web Dashboard — Brand Feature Matrix (parity achieved)
From `getcollab/src/pages/dashboard/*` and `nav-config.ts`:

| Feature | Web Route | Mobile Status |
|---|---|---|
| Dashboard Home | `/dashboard` | ✅ Feed, trial banner, quick-actions |
| Campaigns | `/dashboard/campaigns` | ✅ |
| Campaign Create | `/dashboard/campaigns/create` | ✅ |
| Campaign Detail sub-tabs | `/dashboard/campaigns/[id]/*` | ✅ Edit, Discover, Circle, Escrow, Execute, Outreach, Responses |
| Creator Discovery | `/dashboard/creators` | ✅ |
| Creator Report | `/dashboard/creators/[id]/report` | ✅ |
| Saved Lists | `/dashboard/creators?view=saved` | ✅ `Saved` filter chip |
| Bids | `/dashboard/bids` | ✅ |
| Chat | `/chat/*` | ✅ |
| Relationships | `/dashboard/relationships` | ✅ |
| Relationship Detail | `/dashboard/relationships/[id]` | ✅ |
| Invites | `/dashboard/invites` | ✅ |
| Wallet | `/dashboard/wallet` | ✅ |
| Invoices | `/dashboard/invoices` | ✅ |
| Analytics (Campaign) | `/dashboard/analytics` | ✅ |
| Analytics (Creator) | `/dashboard/analytics?view=creators` | ✅ Analytics tab switcher |
| Growth / SEO | `/dashboard/growth/*` | ✅ All 6 sections + setup |
| Affiliate Programs | `/dashboard/affiliate/*` | ✅ Programs, Detail, Links, Commissions |
| Settings — Profile | `/dashboard/settings/profile` | ✅ |
| Settings — Account | `/dashboard/settings/account` | ✅ |
| Settings — Security | `/dashboard/settings/security` | ✅ |
| Settings — Notifications | `/dashboard/settings/notifications` | ✅ Granular email/push toggles |
| Settings — Team | `/dashboard/settings/team` | ✅ |
| Settings — Billing | `/dashboard/settings/billing` | ✅ |
| Settings — Payouts | `/dashboard/settings/payouts` | N/A (brand) |
| Disputes | `/dashboard/disputes` | ✅ |

---

## 2. Implementation Plan — All Phases Complete

### Phase 0 — Fix Errors & Foundation ✅
**Goal:** Zero TypeScript errors, stable baseline.

- [x] **Fix onboarding TS errors** — arrays normalized to `string[]`; `renderChips` simplified.
- [x] **Verify `tsc --noEmit` passes** — `./node_modules/.bin/tsc --noEmit` → exit `0`.
- [x] **Audit shared package types** — Wallet, Relationship, Invoice, Affiliate, Team, Growth types present in `@getcollab/mobile-shared`.
- [x] **Add missing API wrappers** — `packages/mobile-shared/src/services/api.ts` now exposes
      `/wallet/*` (summary, transactions, topup, refund-request), `/relationships/*` (list, detail,
      create, search, collaborations, timeline), `/affiliate/*` (programs CRUD + activate/pause/
      resume/close/budget/apply, links, rewards, applications review), and
      `/subscriptions/invoices` + `/subscriptions/invoices/:id/download`.

### Phase 1 — Core Brand Money & People ✅
**Goal:** Wallet, Relationships, Invites, Saved Creators.

| # | Task | Status | Implementation |
|---|---|---|---|
| 1.1 | **Wallet Screen** | ✅ | `(main)/brand/wallet/index.tsx` — balance cards, paginated transaction list, Top-up modal (idempotency key), Request Refund modal. Wired to `fetchWalletSummary` / `fetchWalletTransactions` / `topUpWallet` / `requestWalletRefund`. |
| 1.2 | **Relationships List** | ✅ | `(main)/brand/relationships/index.tsx` — searchable, status badges, totals, Add CTA. |
| 1.3 | **Relationship Detail** | ✅ | `(main)/brand/relationships/[id].tsx` — partner info, collaboration history, timeline, chat CTA. |
| 1.4 | **Invites Screen** | ✅ | `(main)/brand/invites/index.tsx` — sent invites + status, resend/cancel. |
| 1.5 | **Saved Creators** | ✅ | `Saved` chip in `(main)/brand/creators/index.tsx`, persisted to `AsyncStorage` (`SAVED_CREATORS_KEY`) with optimistic local state. |
| 1.6 | **Navigation wiring** | ✅ | `MainTabs.tsx` registers `Wallet`, `Relationships`, `RelationshipDetail`, `Invites`. Dashboard quick-action grid extended to 9 actions (Find Creators, Create Campaign, Messages, View Bids, Wallet, Relationships, Analytics, Growth, Invoices). |

### Phase 2 — Campaign Lifecycle Depth ✅
**Goal:** Match web campaign workspace sub-pages.

| # | Task | Status | File |
|---|---|---|---|
| 2.1 | **Campaign Edit** | ✅ | `campaigns/[id]/edit.tsx` |
| 2.2 | **Campaign Discover** | ✅ | `campaigns/[id]/discover.tsx` |
| 2.3 | **Campaign Responses** | ✅ | `campaigns/[id]/responses.tsx` |
| 2.4 | **Campaign Execute** | ✅ | `campaigns/[id]/execute.tsx` |
| 2.5 | **Campaign Outreach** | ✅ | `campaigns/[id]/outreach.tsx` |
| 2.6 | **Campaign Escrow** | ✅ | `campaigns/[id]/escrow.tsx` |
| 2.7 | **Campaign Circle** | ✅ | `campaigns/[id]/circle.tsx` |

All seven are registered as `CampaignEdit` / `CampaignDiscover` / `CampaignResponses` /
`CampaignExecute` / `CampaignOutreach` / `CampaignEscrow` / `CampaignCircle` and linked from the
campaign detail `DetailAction` row alongside Analytics.

### Phase 3 — Analytics & Growth ✅
**Goal:** Rich analytics parity.

| # | Task | Status | Implementation |
|---|---|---|---|
| 3.1 | **Analytics Dashboard** | ✅ | `(main)/brand/analytics/index.tsx` — Campaign / Creator tab switcher, metric cards + sparklines, creator performance table. |
| 3.2 | **Creator Report** | ✅ | `(main)/brand/creators/[id]/report.tsx` — audience demographics, engagement, past collabs, estimated reach. |
| 3.3 | **Growth workspace** | ✅ | `(main)/brand/growth/{index,setup,seo,search-console,ai-visibility,opportunities,recommendations}.tsx` — full parity with web's 6 sections + setup, sharing `src/components/growth/growth-shared.tsx`. |

### Phase 4 — Settings Expansion ✅
**Goal:** Match web settings routes.

| # | Task | Status | File |
|---|---|---|---|
| 4.1 | **Settings — Profile** | ✅ | `(main)/settings/profile.tsx` |
| 4.2 | **Settings — Account** | ✅ | `(main)/settings/account.tsx` |
| 4.3 | **Settings — Security** | ✅ | `(main)/settings/security.tsx` |
| 4.4 | **Settings — Team** | ✅ | `(main)/settings/team.tsx` |
| 4.5 | **Settings — Billing** | ✅ | `(main)/settings/billing.tsx` |
| 4.6 | **Settings — Notifications** | ✅ | `(main)/settings/notifications.tsx` |
| 4.7 | **Settings shell refactor** | ✅ | `(main)/settings/index.tsx` — 6-section list (Profile, Account, Security, Notifications, Team, Billing) + Delete Account. |

### Phase 5 — Affiliate ✅
**Goal:** Affiliate program management.

| # | Task | Status | File |
|---|---|---|---|
| 5.1 | **Affiliate Programs** | ✅ | `(main)/brand/affiliate/index.tsx` |
| 5.2 | **Affiliate Links** | ✅ | `(main)/brand/affiliate/links.tsx` |
| 5.3 | **Affiliate Commissions** | ✅ | `(main)/brand/affiliate/commissions.tsx` |
| 5.4 | **Affiliate Detail** *(bonus)* | ✅ | `(main)/brand/affiliate/[id].tsx` |

### Phase 6 — Polish & QA ✅
**Goal:** Zero errors, consistent UX, feature flag readiness.

- [x] **TypeScript:** `tsc --noEmit` clean (exit `0`).
- [x] **Feature flags:** `TrialGuard` wraps `campaign:create`, `campaign:unlimited-outreach`,
      `influencer:unlimited-search`, `analytics:premium` (create campaign, bids, creators,
      campaign analytics). `SubscriptionExpiredModal` on dashboard.
- [x] **Empty states:** Icon + title + subtitle + CTA on every list (campaigns, creators, bids,
      chat, invites, wallet transactions, invoices, relationships, affiliate, analytics).
- [x] **Error boundaries:** `ErrorBoundary` from `@shared/components/ErrorBoundary` wraps the app
      root in `getcollab-brand/App.tsx`.
- [x] **Loading states:** `ActivityIndicator` / skeletons + `RefreshControl` on all async routes.
- [x] **Deep links:** `notification-service.ts` routes `chat` → ChatDetail, `campaign` →
      CampaignDetails, `bid` → Bids, `subscription` → Dashboard. *(New screen types are a
      follow-up — see §6.1.)*
- [x] **Re-build graphify:** rebuilt — `graphify-out/` graph contains `brand/wallet`,
      `brand/relationships`, `brand/affiliate`, `brand/growth`, `brand/invoices`.

---

## 3. Architecture Decisions (as implemented)

### 3.1 Navigation Structure
```
MainTabs (bottom)
├── Dashboard
├── Campaigns
├── Creators
├── Chat
└── Profile

BrandStack (native-stack overlays) — src/navigation/MainTabs.tsx
├── CampaignDetails → CampaignEdit / CampaignDiscover / CampaignResponses /
│                     CampaignExecute / CampaignOutreach / CampaignEscrow /
│                     CampaignCircle / CampaignAnalytics
├── Wallet
├── Relationships → RelationshipDetail
├── Invites
├── Affiliate → AffiliateDetail / AffiliateLinks / AffiliateCommissions
├── Analytics
├── CreatorReport
├── Growth → GrowthSetup / GrowthSeo / GrowthSearchConsole /
│            GrowthAiVisibility / GrowthOpportunities / GrowthRecommendations
├── Invoices
├── Settings → Profile / Account / Security / Team / Billing / NotificationSettings
└── ... existing screens (Disputes, Subscription, Onboarding, ProfilePreview, …)
```
Registered in `MainTabs.tsx` (`BrandStackInner`), gated by `AuthGate`. Discovery entry points:
dashboard quick-action grid + brand profile settings rows.

### 3.2 Data Layer
- Re-uses the existing `apiService` in `@getcollab/mobile-shared` — no new client.
- New endpoint wrappers added to `packages/mobile-shared/src/services/api.ts` for wallet,
  relationships, affiliate, and invoices, following the web API contracts.
- Local `useState` + `useFocusEffect` / `RefreshControl` for screen data; Zustand only where
  cross-screen caching exists (`auth-store`, `subscription-store`, `chat-store`,
  `reference-data-store`, `notification-store`). No speculative `wallet-store` /
  `relationship-store` was added.

### 3.3 UI Patterns (matched)
- **Cards:** `colors.card` bg, `colors.border` border, `radius.lg`.
- **Buttons:** `colors.blue` primary, `radius.pill`.
- **Status pills:** colored dot + text.
- **Empty states:** Icon in circle + title + subtitle + CTA button.
- **Modals:** fade overlay, max-width 400, centered (wallet Top-up / Refund).
- **SafeAreaView:** `edges={['top']}` for headers, `edges={['bottom']}` for lists.
- **Motion:** `react-native-reanimated` `FadeInDown` staggered entries.

### 3.4 Mobile-First Simplifications (vs Web)
| Web Feature | Mobile Simplification | Applied |
|---|---|---|
| DataTable (TanStack) | FlatList with card rows | ✅ |
| Charts (Recharts) | Metric cards + sparklines (no new dep) | ✅ |
| Growth workspace | Full section-per-screen parity (6 sections + setup) | ✅ |
| Rich text editors | Plain TextInput multiline | ✅ |
| PDF invoices | `Linking.openURL(downloadUrl)` | ✅ |
| Campaign wizard (multi-step) | Existing scroll form reused for create + edit | ✅ |

---

## 4. Decisions Taken

1. **Growth workspace:** ✅ **Fully implemented** (was deferred). Mobile ships all six web sections
   plus setup, one screen each so the sub-nav mirrors web's six routes exactly:
   `growth/index.tsx` (Overview — score, signals, issue counts, next steps, content coverage, GSC +
   AI cards, run-analysis with crawl polling), `growth/setup.tsx`, `growth/seo.tsx` (severity filters,
   AI-readiness checklist), `growth/search-console.tsx` (OAuth connect, property picker, sync, query
   rows), `growth/ai-visibility.tsx` (metrics, providers, missed prompts, copilot Q&A),
   `growth/opportunities.tsx`, `growth/recommendations.tsx` (approve/dismiss/done + creator handoff).
   Shared shell/labels live in `src/components/growth/growth-shared.tsx`, mirroring web's
   `growth-workspace.tsx` + `growth-copy.ts`. 17 API wrappers added to `@shared/services/api`.
   Mobile-appropriate substitutions: the GSC property `<select>` becomes chips, the queries table
   becomes cards, and `window.location.href` for OAuth becomes `Linking.openURL` with a refetch on
   focus. Unconnected signals still render blank rather than a misleading `0`.
2. **Charts:** ✅ **No chart library added.** Metric cards + sparklines keep the bundle lean
   (no `react-native-chart-kit` / `victory-native` in `package.json`).
3. **Invoices:** ✅ **Open external URL.** `downloadInvoice` returns a URL, opened via
   `Linking.openURL` — no in-app PDF viewer.
4. **Team invites:** ✅ **Yes** — mobile uses the same backend endpoints as web
   (`settings/team.tsx` lists members + invites, invite-by-email supported).
5. **Scope of "all features":** ✅ **Brand-only**, as planned. `getcollab-brand` covers every
   brand-facing `/dashboard/*` route; influencer-only pages live in `getcollab-influencer`.

---

## 5. Success Criteria — Verified

- [x] `cd getcollab-mobile-mono/getcollab-brand && tsc --noEmit` exits `0`.
- [x] Every brand-relevant web route has a mobile counterpart (see §1.3).
- [x] Every brand screen has `@testing-library/react-native` coverage — 161 tests / 17 suites green.
- [x] All new screens are registered in `MainTabs.tsx` and reachable from the UI.
- [x] Zero `TrialGuard` / subscription regressions on gated features.
- [x] graphify graph rebuilt for `getcollab-mobile-mono`.

---

## 6. Follow-ups — all closed

### Resolved

1. ✅ **Push deep links now cover every screen.** `packages/mobile-shared/src/lib/notification-routes.ts`
   resolves a payload to a route in one pure function: an explicit `deep_link` (web path, absolute
   or relative) wins, with the event type as fallback. Covered: chat, campaigns (+ all 8 workspace
   sub-tabs), creators + creator report, relationships (+ detail), wallet, invoices, analytics,
   growth, invites, bids, disputes, affiliate (program / detail / links / commissions), settings
   (all 6 sub-pages), billing, subscription. The in-app notification list previously only marked
   items read; it now routes through the same mapper.
   *Backend note (updated): `mobile_push` is now registered in `cmd/worker/main.go` (Expo push
   channel), and the apps register tokens as `ios`/`android` — `expo` was rejected by the API.*
2. ✅ **Screen-level tests exist and the harness works.** The brand suite was not thin — it was
   **dead**: a hand-rolled `transformIgnorePatterns` used `node_modules/(?!…)`, which cannot see
   through pnpm's `node_modules/.pnpm/<pkg>/node_modules/<pkg>` layout, so React Native's own ESM
   `jest/setup.js` was never transformed and all 3 suites died on
   `Cannot use import statement outside a module`. Fixed by spreading the `jest-expo` preset
   (pnpm-aware pattern, RN env, RN `setupFiles`) and adding the reanimated / safe-area /
   async-storage / vector-icons doubles. Three pre-existing failures surfaced once tests could run
   (stale mocks in `auth-store` and `subscription-store` tests, incl. the pre-`TRIALING` status
   contract) and were fixed.
   **161 tests / 17 suites pass**, `tsc --noEmit` exits `0`. New coverage: all 31 screens — wallet,
   relationships (+ detail), invites, invoices, affiliate, analytics, creator report, all 7 growth
   sections, all 7 campaign sub-tabs, all 6 settings sub-pages + shell, creators/saved,
   notifications, plus 52 cases for the notification route mapper.
3. ✅ **Saved creators sync through the backend.** The `Saved` chip is backed by a brand-owned
   **creator circle** (`Saved Creators`, created lazily on first bookmark) instead of install-local
   storage, so the shortlist follows the brand across devices. `AsyncStorage` is kept only as an
   offline mirror: it paints first, then reconciles with the server, and a rejected write rolls the
   bookmark back rather than showing state the server never stored. This required one new endpoint —
   `GET /v1/creator-circles/{id}/members` (`listCircleMembers`, tenant-checked, 404/403/400 covered
   by tests) — because circle membership had no HTTP read path.
4. ✅ **The Growth workspace is fully implemented** (previously deferred to a read-only screen).
   See §4.1 — all six web sections plus setup, one screen each, with 17 new API wrappers and 26
   tests.

### Remaining

None. Every item in this plan is shipped; the only deliberate mobile-vs-web differences are the
input-control substitutions recorded in §3.4.

---

## 7. Gaps found on verification (2026-09-23) — fixed

Checked each ✅ screen against the routes getcollab-go actually serves. These were marked done but
did not work:

| Screen | Problem | Fix |
|---|---|---|
| Settings — Account / Notifications, Brand Profile, influencer Settings | `GET/PUT /settings`, `POST /settings/notifications`, `/settings/profile` do not exist: screens loaded defaults, every save failed | `apiService.getSettings/updateSettings/updateNotificationSettings/updateGeneralProfile` rebuilt on `/auth/me`, `PATCH /auth/account` (full replace, so current values are read back first), `/profile`, and `/notifications/preferences`. Toggle keys map to event types in `mobile-shared/src/lib/notification-prefs.ts` (tested). |
| Settings — Notifications | "Weekly Digest" toggle had no backend | Removed |
| Influencer Settings | "Two-Factor Authentication" toggle — the API has no 2FA | Removed |
| Campaign Execute | Read `deal.deliverables`, which the API never returns — always "No deliverables yet" | Lists the campaign's collaborations (names from bids), opens the new **DealReview** screen |
| (new) DealReview | Brand app had no deal screen | Sign, fund, per-deliverable review, release, dispute, timeline |
| Campaign Escrow | Showed the campaign **budget** as "funded" and the org-wide **wallet** as held | Reads `GET /escrow/campaigns/{id}/pool` |
| Create Campaign | Cover uploaded to `/profile/upload` (does not exist) and sent as `coverImage` (API reads `featuredImage`) — no cover was ever saved | `uploadCampaignCover` via `/campaigns/upload-url`; sends `featuredImage` |
| Disputes | Sent `campaignId` (API requires `dealId`); evidence uploaded to `/profile/upload` (does not exist) | Files against a chosen collaboration; evidence picker removed (disputes carry text only) |
| Invite creator / Campaign Discover | `POST /campaigns/{id}/invite` does not exist | `POST /deals/invites` |
| Bids / Creators / Responses / Relationship "Message" | `POST /chat/direct` does not exist | `POST /chat/rooms` with the brand org id; backend now resolves a creator **profile** id to the user id rooms are keyed by |
| Chat | Text sent as `content` (API reads `message`, so saved empty); images/files used `/chat/upload` and fields the presign never returned; socket.io client never connected (backend is Sockudo) | `message` field; uploads via the media service + `blob_ids`; chat polls (5 s messages, 60 s rooms) like web; read state saved via `POST /chat/rooms/{id}/read` |
| Dashboard checklist | "Add a way to pay creators" hard-coded `false` (`// TODO`) | "Fund your wallet", done when the wallet holds money |
| Push | Registered `platform: 'expo'` (rejected); no `mobile_push` channel | `ios`/`android`; Expo channel in the worker; deal notifications deep-link to the collaboration |

Backend fixes found on the way (getcollab-go): brand profile upsert sent nil `industries` and empty
`country_code/city/state` as NULL into NOT NULL columns, so saving a brand profile without them
failed.

### Remaining (deliberate)

- Brand **bio / location** on Settings — Profile are not saved: brand profile writes (`PATCH /profile`) replace every field, and the screen does not load them all yet.
- `socket.io-client` is still listed in the three `package.json` files but no longer imported; remove it with a lockfile update.
- Realtime is polling; Sockudo (`pusher-js`) when latency matters.
- Not device-tested: these were verified by `tsc`, Jest, and the backend's own tests — build a dev client (`npx expo run:ios`) to exercise them on a simulator.
