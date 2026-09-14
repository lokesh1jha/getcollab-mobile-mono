---
name: mobile-shared-package
description: How the getcollab-mobile-mono workspace fits together — the @shared alias, which stores and services live in mobile-shared, apiService usage, and when code belongs in the shared package vs one app. Load before adding a store, service, API call, or cross-app component.
---

# Shared package & workspace

```
getcollab-mobile-mono/
  getcollab-brand/        # brand app — businesses running campaigns
  getcollab-influencer/   # creator app — influencers finding campaigns
  packages/mobile-shared/ # shared stores, services, components, types
```

pnpm workspaces. Aliases (wired in each app's `metro.config.js` + `tsconfig.json`):

- `@shared/*` -> `packages/mobile-shared/src/*`
- `@/*` -> that app's root

## Running

```bash
pnpm brand          # Metro, brand app
pnpm brand:ios      # build + run iOS simulator
pnpm influencer
pnpm influencer:ios
```

Both apps need a dev build (`npx expo run:ios`) — reanimated, notifications and secure-store are
custom native modules that do not work in Expo Go.

## What lives in `@shared`

| Import | Purpose |
|---|---|
| `@shared/stores/auth-store` | Session, tokens, current user |
| `@shared/stores/chat-store` | Rooms + messages (`fetchRooms()`, `sendMessage()`) |
| `@shared/stores/campaign-store` | Campaign CRUD |
| `@shared/stores/influencer-store` | Creator data |
| `@shared/stores/notification-store` | Notifications |
| `@shared/services/api` | HTTP — `apiService` |
| `@shared/services/logger` | Logging |
| `@shared/types` | Shared types (`ChatRoom`, …) |
| `@shared/components/ui` | Cross-app primitives |

**Theme is the exception**: always import colours from the app's own `@/src/theme`, never from
`@shared/constants`.

## API access

All network calls go through `apiService` (`@shared/services/api`), which handles SecureStore
tokens, refresh-and-retry, the `X-Device-Id` header and the offline banner. Never call `fetch`
directly.

```ts
apiService.signin({ email, password })
apiService.getCampaigns(params?)      // discover
apiService.getMyCampaigns()           // brand's own
apiService.getBids(params?)           // influencer's bids
apiService.submitBid({ campaignId, amount, message })
apiService.getProfile() / getProfileWithMetrics() / updateProfile(updates)
apiService.getEarnings() / requestPayout({ amount, message, campaignId? })
apiService.getNotifications()
```

Chat is the exception — go through `chat-store` (REST + socket.io), not `apiService` directly.

`EXPO_PUBLIC_API_URL` in `.env` points at the backend, e.g.
`https://api.getcollab.in/api/v1`.

## Shared vs app-local

Put it in `packages/mobile-shared` when **both** apps need it: API calls, stores, domain types,
generic UI primitives. Keep it in the app when it encodes one side's product behaviour — screens,
navigation, theme, and anything brand-only or creator-only.

Changing a shared store affects both apps. Check the other app's usage before altering a store's
shape.

## E2E

Both apps have `.maestro/` YAML flows (auth, campaigns, chat, subscriptions). Run the Maestro CLI
against a dev build.
