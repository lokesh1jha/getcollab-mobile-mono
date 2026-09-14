# GetCollab Mobile Monorepo

AI-powered influencer marketing platform with two React Native apps sharing a common package.

## graphify

This repo has its own graphify knowledge graph at `graphify-out/` (per-repo graphs — there is
no workspace-wide graph; see the workspace root `CLAUDE.md`).

- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for
  god nodes and community structure
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files
- After modifying code files in this repo, rebuild this repo's graph (run from the repo root):

  ```bash
  ../venv/bin/python3.14 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"
  ```

## Repo Layout

```
getcollab-mobile-mono/
├── getcollab-brand/         # Brand app — for businesses running campaigns
├── getcollab-influencer/    # Creator app — for influencers finding campaigns
├── packages/
│   └── mobile-shared/       # Shared stores, services, components, types
└── pnpm-workspace.yaml      # pnpm workspaces root
```

**Import alias:** `@shared/*` → `packages/mobile-shared/src/*`, `@/*` → app root (brand or influencer). Both apps have metro.config.js and tsconfig.json wired for these.

## Running the Apps

```bash
# Brand app
pnpm brand               # start Metro
pnpm brand:ios           # build + run iOS simulator

# Influencer/Creator app
pnpm influencer          # start Metro
pnpm influencer:ios      # build + run iOS simulator
```

Both apps require `npx expo run:ios` (dev build) — they use custom native modules (reanimated, notifications, secure store) that don't work in Expo Go.
## Skills — load before writing code

Detailed conventions live in `.claude/skills/` so they load only when relevant:

| Skill | Load before |
|---|---|
| `mobile-screen-pattern` | Any screen or component work — theme tokens, screen skeleton, loading/empty/list states, Pressable + reanimated rules |
| `mobile-shared-package` | Adding a store, service, API call, or cross-app component — `@shared` layout and `apiService` |

Full component spec: [getcollab-brand/DESIGN.md](getcollab-brand/DESIGN.md).

Non-negotiables (the rest is in the skills): import colors from `@/src/theme` never
`@shared/constants`; `Pressable` not `TouchableOpacity`; `react-native-reanimated` not core
`Animated`; every screen gets an entrance animation; every `Pressable` gets a visible pressed state.

## Current State (audited Sep 2026)

### Real, API-wired (works end-to-end)
- Auth: sign in/up, forgot/reset password, verify email, change password
- Onboarding: category → creator-profile → terms (influencer steps 1–2, terms acceptance)
- Discover + campaign details + bidding (`submitBid`), MyCampaigns (`getBids`, `updateBidStatus`)
- Chat: REST + socket.io + image attachments (`presignChatAttachments`, `sendChatMessageWithAttachments`)
- Notifications (list, mark read/all), Disputes, Settings, Earnings (list + `requestPayout`), Profile + ProfilePreview
- All calls go through `@shared/services/api` (SecureStore tokens, refresh retry, `X-Device-Id`, network banner)

### Mock / hardcoded data (must strip before manual testing / prod)
- **None remaining.** Dashboard mock data was removed earlier; the only stub (social Google/Facebook/Instagram sign-in buttons with a TODO in signin/signup) was removed on Sep 4 2026 — the backend's native Google endpoint (`POST /auth/google/token`, ID-token → session) exists, so re-add real buttons wired to `CompleteGoogleIDToken` once Google Sign-In SDK + client IDs are configured in the app.

### Missing vs getcollab web (gap list for prod readiness)
- **Subscriptions/billing**: **Brand-only** — the Go backend (`getcollab-go/internal/billing/service.go` `Status()`) hardcodes influencer accounts as `{"plan": "INFLUENCER", "status": "active", "isActive": true}`; all quota/entitlement/checkout logic (campaign limits, marketplace search, influencer reports, seats, AI insights) applies to brand orgs via Razorpay. Influencer app needs NO paywall/checkout UI — at most a read-only plan row in Settings. The `apiService` subscription methods exist but are for brand-app use.
- **Analytics**: influencer Analytics screen now exists (`getcollab-influencer/src/screens/(main)/analytics/index.tsx`, registered in MainTabs, dashboard quick action). It derives stats from the influencer's own APIs (`getBids`, `getEarnings`, `getProfileWithMetrics`) — the backend `/analytics` endpoint is brand-org scoped and intentionally unused here. Includes: applications/win-rate, 30-day application activity chart (client-bucketed from bid dates), per-campaign bid aggregation, bid value, earnings, audience by platform. Still web-only: true timeseries/campaign-level analytics (needs an influencer-scoped backend endpoint; blocked by arch-lint edge `analytics→deals`).
- **Campaign execution & escrow, deals/negotiation workflow, AI features, influencer reports, documents, affiliate/growth**: web-only (`getcollab` has services + components; mobile has none).
- **Profile editing**: **wired** — profile screen saves pricing via `updatePricing`, gender/age via `updateDemographics`, and avatar/cover via `uploadProfileImage`/`uploadCoverImage`. Earnings screen merges `getSettlements` history.
- `getMarketplace` / `discoverCreators` unused — acceptable for the creator app.
## E2E Tests (Maestro)

Both apps have `.maestro/` with YAML flow files for auth, campaigns, chat, subscriptions. Run with the Maestro CLI after a dev build.

## Environment

Both apps read `EXPO_PUBLIC_API_URL` from `.env`. Example: `EXPO_PUBLIC_API_URL=https://api.getcollab.in/api/v1`
